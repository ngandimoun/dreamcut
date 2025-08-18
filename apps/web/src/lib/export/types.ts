/**
 * Types for video export functionality
 */

import { TProject } from "@/types/project";
import { TimelineTrack } from "@/types/timeline";
import { MediaItem } from "@/stores/media-store";

export type ExportJobStatus = "queued" | "processing" | "completed" | "failed";

export interface ExportJob {
  id: string;
  user_id: string;
  project_id: string;
  status: ExportJobStatus;
  width: number;
  height: number;
  fps: number;
  duration: number;
  progress: number;
  download_url?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface CreateExportJobRequest {
  project_id: string;
  timeline_data: {
    project: TProject;
    tracks: TimelineTrack[];
    mediaItems: Record<string, MediaItem>;
  };
}

export interface ExportJobResponse {
  job: ExportJob;
  message: string;
}

export interface ExportJobStatusResponse {
  job: ExportJob;
}

export interface ExportJobError {
  error: string;
  message: string;
  status: number;
}
