/**
 * Timeline to FFmpeg Converter
 * Converts a timeline JSON structure to FFmpeg command arguments
 */

import { TimelineTrack, TimelineElement } from "@/types/timeline";
import { TProject } from "@/types/project";
import { MediaItem } from "@/stores/media-store";

// Helper types for export
export interface ExportTimelineData {
  project: TProject;
  tracks: TimelineTrack[];
  mediaItems: Record<string, MediaItem>;
}

export interface FFmpegCommandResult {
  args: string[];
  debug: {
    inputs: string[];
    filters: string[];
    composedVideo: string;
    composedAudio: string | null;
  };
}

// Helper functions
const posToXY = (
  position: string | undefined,
  W = "W",
  H = "H",
  w = "w",
  h = "h",
  margin = 20
): { xExpr: string; yExpr: string } => {
  // returns { xExpr, yExpr } for overlay
  switch ((position || "").toLowerCase()) {
    case "top-left":
      return { xExpr: `${margin}`, yExpr: `${margin}` };
    case "top-right":
      return { xExpr: `${W}-${w}-${margin}`, yExpr: `${margin}` };
    case "bottom-left":
      return { xExpr: `${margin}`, yExpr: `${H}-${h}-${margin}` };
    case "center":
    case "middle":
      return { xExpr: `(${W}-${w})/2`, yExpr: `(${H}-${h})/2` };
    case "bottom-right":
    default:
      return { xExpr: `${W}-${w}-${margin}`, yExpr: `${H}-${h}-${margin}` };
  }
};

const effectVideoChain = (effects: any[] = []): string => {
  // Map simple effect names to ffmpeg vf snippets
  const parts: string[] = [];
  for (const e of effects) {
    if (!e) continue;
    if (typeof e === "string") {
      switch (e) {
        case "grayscale":
          parts.push("hue=s=0");
          break;
        case "blur":
          parts.push("gblur=sigma=10");
          break;
        case "sharpen":
          parts.push("unsharp");
          break;
        case "invert":
          parts.push("negate");
          break;
        default:
          break;
      }
    } else if (typeof e === "object") {
      // e.g. { type: "brightness", value: 0.1 }
      if (e.type === "brightness") parts.push(`eq=brightness=${e.value ?? 0}`);
      if (e.type === "contrast") parts.push(`eq=contrast=${e.value ?? 1}`);
      if (e.type === "saturation") parts.push(`eq=saturation=${e.value ?? 1}`);
      if (e.type === "crop")
        parts.push(`crop=${e.w}:${e.h}:${e.x}:${e.y}`);
      if (e.type === "scale")
        parts.push(`scale=${e.w}:${e.h}:flags=bicubic`);
      if (e.type === "boxblur")
        parts.push(`boxblur=${e.luma ?? 5}:${e.chroma ?? 5}`);
    }
  }
  return parts.join(",");
};

const seconds = (n: number | string | undefined): string =>
  (typeof n === "number" ? n : parseFloat(n || "0") || 0).toFixed(3);

/**
 * Converts timeline data to FFmpeg command arguments
 */
export function buildFfmpegFromTimeline(
  timelineData: ExportTimelineData
): FFmpegCommandResult {
  const { project, tracks, mediaItems } = timelineData;
  
  const width = project.canvasSize.width;
  const height = project.canvasSize.height;
  const fps = project.fps || 30;
  const bg = (project.backgroundColor || "#000000").replace("#", "0x");

  // Inputs & filter graph builders
  const inputs: string[] = []; // array of `-i <path or lavfi>`
  const filters: string[] = []; // strings composing filter_complex
  const videoLayers: string[] = []; // collect labeled video streams to overlay sequentially
  const audioLayers: string[] = []; // collect labeled audio streams to mix

  let inputIndex = 0;
  let labelCounter = 0;
  const vLabel = () => `v${labelCounter++}`;
  const aLabel = () => `a${labelCounter++}`;

  // Base canvas (color source) to force output geometry/fps
  // label: baseV
  inputs.push(`-f lavfi -i color=c=${bg}:s=${width}x${height}:r=${fps}`);
  let baseV = "baseV";
  filters.push(
    `[0:v]format=yuv420p,setsar=1,scale=${width}:${height},fps=${fps}[${baseV}]`
  );

  // Map media items to their URLs for FFmpeg input
  const mediaUrlMap = new Map<string, { url: string; index: number }>();
  
  // Pre-collect all external media inputs with their clip metadata
  const mediaElements: {
    element: TimelineElement;
    trackType: string;
    mediaItem?: MediaItem;
  }[] = [];
  
  tracks.forEach((track) => {
    track.elements.forEach((element) => {
      if (element.type === "media") {
        const mediaItem = mediaItems[element.mediaId];
        if (mediaItem) {
          // Only add media items that aren't already in the map
          if (!mediaUrlMap.has(element.mediaId)) {
            inputIndex++;
            inputs.push(`-i ${mediaItem.url}`);
            mediaUrlMap.set(element.mediaId, { 
              url: mediaItem.url || "",
              index: inputIndex 
            });
          }
          
          mediaElements.push({
            element,
            trackType: track.type,
            mediaItem
          });
        }
      } else if (element.type === "text") {
        mediaElements.push({
          element,
          trackType: track.type
        });
      }
    });
  });

  // Build video tracks: place each track's clips on its own linear timeline, then overlay tracks
  let overlayBase = baseV;

  // Handle VIDEO tracks: trim, effects, transition (crossfade)
  const videoElements = mediaElements.filter(
    (item) => item.trackType === "media" && item.mediaItem?.type === "video"
  );
  
  if (videoElements.length > 0) {
    // Create a blank canvas for the video track
    const trackBase = vLabel();
    filters.push(`[${baseV}]null[${trackBase}]`);
    let current = trackBase;
    
    for (const { element, mediaItem } of videoElements) {
      if (!mediaItem) continue;
      
      const mediaInfo = mediaUrlMap.get(element.mediaId);
      if (!mediaInfo) continue;
      
      const inIdx = mediaInfo.index;
      const start = seconds(element.startTime);
      const dur = seconds(element.duration);
      
      // Scale each video to canvas and set fps/sar
      const out = vLabel();
      const chain = [
        `[${inIdx}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${bg},fps=${fps},setsar=1`,
        `trim=start=${element.trimStart}:end=${element.trimStart + element.duration},setpts=PTS-STARTPTS+${start}/TB`
      ].filter(Boolean).join(",");

      filters.push(`${chain}[${out}]`);
      
      // Overlay this video on the current composition
      const outO = vLabel();
      const end = seconds(element.startTime + element.duration);
      
      filters.push(
        `[${current}][${out}]overlay=shortest=1:enable='between(t,${start},${end})'[${outO}]`
      );
      current = outO;
    }
    
    overlayBase = current;
  }

  // Handle IMAGE tracks: overlay with timing and positioning
  const imageElements = mediaElements.filter(
    (item) => item.trackType === "media" && item.mediaItem?.type === "image"
  );
  
  let currentV = overlayBase;
  
  if (imageElements.length > 0) {
    for (const { element, mediaItem } of imageElements) {
      if (!mediaItem) continue;
      
      const mediaInfo = mediaUrlMap.get(element.mediaId);
      if (!mediaInfo) continue;
      
      const inIdx = mediaInfo.index;
      const start = seconds(element.startTime);
      const end = seconds(element.startTime + element.duration);
      
      // For images, we need to scale them appropriately
      const labScaled = vLabel();
      filters.push(
        `[${inIdx}:v]scale=${mediaItem.width || width}:${mediaItem.height || -1}:force_original_aspect_ratio=decrease,format=rgba[${labScaled}]`
      );
      
      // Overlay the image at the center of the frame by default
      const outO = vLabel();
      filters.push(
        `[${currentV}][${labScaled}]overlay=x='(W-w)/2':y='(H-h)/2':shortest=1:enable='between(t,${start},${end})'[${outO}]`
      );
      currentV = outO;
    }
  }

  // Handle TEXT tracks: drawtext with timing
  const textElements = mediaElements.filter(
    (item) => item.element.type === "text"
  );
  
  if (textElements.length > 0) {
    for (const { element } of textElements) {
      if (element.type !== "text") continue;
      
      const start = seconds(element.startTime);
      const end = seconds(element.startTime + element.duration);
      
      // Position text based on x,y coordinates (centered by default)
      const xPos = element.x !== undefined ? `${width/2 + element.x}` : `(W-tw)/2`;
      const yPos = element.y !== undefined ? `${height/2 + element.y}` : `(H-th)/2`;
      
      const outT = vLabel();
      const textEsc = String(element.content || "").replace(/:/g, "\\:");
      
      filters.push(
        `[${currentV}]drawtext=text='${textEsc}':` +
        `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:` +
        `fontsize=${element.fontSize}:` +
        `fontcolor=${element.color.replace("#", "0x")}:` +
        `box=${element.backgroundColor !== 'transparent' ? '1' : '0'}:` +
        `boxcolor=${element.backgroundColor.replace("#", "0x")}:` +
        `boxborderw=5:` +
        `x=${xPos}:y=${yPos}:` +
        `enable='between(t,${start},${end})'[${outT}]`
      );
      
      currentV = outT;
    }
  }

  let composedVideo = currentV;

  // AUDIO: mix all audio clips according to start/duration/volume/fades
  const audioElements = mediaElements.filter(
    (item) => 
      (item.trackType === "audio") || 
      (item.trackType === "media" && item.mediaItem?.type === "audio") ||
      (item.trackType === "media" && item.mediaItem?.type === "video" && !(item.element as any).muted)
  );
  
  const audioClipLabels: string[] = [];
  
  if (audioElements.length > 0) {
    for (const { element, mediaItem } of audioElements) {
      if (!mediaItem) continue;
      
      const mediaInfo = mediaUrlMap.get((element as any).mediaId);
      if (!mediaInfo) continue;
      
      const inIdx = mediaInfo.index;
      const start = seconds(element.startTime);
      const dur = seconds(element.duration);
      
      // Default volume is 1.0
      const vol = 1.0;
      
      // Trim and delay to align on absolute timeline
      const outA = aLabel();
      filters.push(
        `[${inIdx}:a]atrim=start=${element.trimStart}:end=${element.trimStart + element.duration},` +
        `asetpts=PTS-STARTPTS,volume=${vol},` +
        `adelay=${Math.round(parseFloat(start) * 1000)}|${Math.round(parseFloat(start) * 1000)}[${outA}]`
      );
      
      audioClipLabels.push(outA);
    }
  }

  let composedAudio = null;
  if (audioClipLabels.length === 1) {
    composedAudio = audioClipLabels[0];
  } else if (audioClipLabels.length > 1) {
    composedAudio = aLabel();
    filters.push(
      `${audioClipLabels.map((l) => `[${l}]`).join("")}amix=inputs=${
        audioClipLabels.length
      }:normalize=1:dropout_transition=2[${composedAudio}]`
    );
  }

  // Assemble final ffmpeg arguments
  const args: string[] = [];

  // Inputs
  inputs.forEach((item) => {
    const [flag, ...rest] = item.split(" ");
    if (flag === "-f") {
      // lavfi color input needs both -f and -i
      args.push("-f", "lavfi");
      const iIndex = rest.indexOf("-i");
      if (iIndex >= 0) {
        // e.g. "-f lavfi -i color=..."
        const afterI = rest.slice(iIndex + 1).join(" ");
        args.push("-i", afterI);
      } else {
        // "-f lavfi color=..."
        args.push("-i", rest.join(" "));
      }
    } else if (flag === "-i") {
      args.push("-i", rest.join(" "));
    } else {
      // default: assume already "-i <...>"
      args.push(...item.split(" "));
    }
  });

  // Filter graph
  args.push("-filter_complex", filters.join(";"));

  // Map video/audio
  args.push("-map", `[${composedVideo}]`);
  if (composedAudio) {
    args.push("-map", `[${composedAudio}]`);
  } else {
    // silent audio track to keep players happy (optional)
    args.push(
      "-f",
      "lavfi",
      "-t",
      "0.1",
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-shortest"
    );
    args.push("-map", "1:a"); // maps the anullsrc (be careful with input index if you change)
  }

  // Encoding settings (tune to your needs)
  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(fps),
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart"
  );

  return {
    args,
    debug: { inputs, filters, composedVideo, composedAudio },
  };
}
