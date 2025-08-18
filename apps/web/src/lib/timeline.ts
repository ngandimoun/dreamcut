import { TimelineTrack, TimelineElement } from "@/types/timeline";

/**
 * Calculate the total duration of a timeline based on all tracks and elements
 * @param tracks Array of timeline tracks
 * @returns Duration in seconds
 */
export function calculateTimelineDuration(tracks: TimelineTrack[]): number {
  if (!tracks || tracks.length === 0) return 0;
  
  let maxEndTime = 0;
  
  // Find the maximum end time across all elements in all tracks
  tracks.forEach(track => {
    track.elements.forEach(element => {
      const elementEndTime = element.startTime + element.duration;
      if (elementEndTime > maxEndTime) {
        maxEndTime = elementEndTime;
      }
    });
  });
  
  return maxEndTime;
}

/**
 * Find all elements within a specific time range
 * @param tracks Array of timeline tracks
 * @param startTime Start time in seconds
 * @param endTime End time in seconds
 * @returns Array of elements that overlap with the time range
 */
export function findElementsInTimeRange(
  tracks: TimelineTrack[],
  startTime: number,
  endTime: number
): { element: TimelineElement; track: TimelineTrack }[] {
  const result: { element: TimelineElement; track: TimelineTrack }[] = [];
  
  tracks.forEach(track => {
    track.elements.forEach(element => {
      const elementStartTime = element.startTime;
      const elementEndTime = element.startTime + element.duration;
      
      // Check if the element overlaps with the time range
      if (elementEndTime > startTime && elementStartTime < endTime) {
        result.push({ element, track });
      }
    });
  });
  
  return result;
}