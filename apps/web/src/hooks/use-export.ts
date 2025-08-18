import { useState, useCallback } from 'react';
import { useTimelineStore } from '@/stores/timeline-store';
import { useProjectStore } from '@/stores/project-store';
import { useMediaStore } from '@/stores/media-store';
import { useToast } from '@/hooks/use-toast';
import { ExportJob, ExportJobResponse } from '@/lib/export/types';

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  // Get data from stores
  const tracks = useTimelineStore(state => state.tracks);
  const activeProject = useProjectStore(state => state.activeProject);
  const mediaItems = useMediaStore(state => state.mediaItems);
  
  // Convert media items to a record for the API
  const mediaItemsRecord = mediaItems.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<string, typeof mediaItems[0]>);
  
  // Start the export process
  const startExport = useCallback(async () => {
    if (!activeProject) {
      toast({
        title: "Export failed",
        description: "No active project found",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsExporting(true);
      setExportError(null);
      setExportProgress(0);
      
      // Prepare the export request
      const exportRequest = {
        project_id: activeProject.id,
        timeline_data: {
          project: activeProject,
          tracks,
          mediaItems: mediaItemsRecord
        }
      };
      
      // Send the export request to the API
      const response = await fetch('/api/export/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start export');
      }
      
      const data = await response.json() as ExportJobResponse;
      setExportJob(data.job);
      
      // Start polling for job status
      pollJobStatus(data.job.id);
      
      toast({
        title: "Export started",
        description: "Your video is being processed. This may take a few minutes."
      });
      
    } catch (error) {
      console.error('Export error:', error);
      setExportError((error as Error).message);
      toast({
        title: "Export failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  }, [activeProject, tracks, mediaItemsRecord, toast]);
  
  // Poll for job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/export/status/${jobId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch export status');
      }
      
      const data = await response.json();
      const job = data.job as ExportJob;
      
      setExportJob(job);
      setExportProgress(job.progress);
      
      // Check if the job is still processing
      if (job.status === 'processing' || job.status === 'queued') {
        // Continue polling
        setTimeout(() => pollJobStatus(jobId), 2000);
      } else if (job.status === 'completed') {
        setIsExporting(false);
        toast({
          title: "Export completed",
          description: "Your video is ready to download."
        });
      } else if (job.status === 'failed') {
        setIsExporting(false);
        setExportError(job.error_message || 'Export failed');
        toast({
          title: "Export failed",
          description: job.error_message || 'Export failed',
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('Error polling job status:', error);
      // Don't stop polling on temporary errors
      setTimeout(() => pollJobStatus(jobId), 5000);
    }
  }, [toast]);
  
  // Get export jobs for the current project
  const getExportJobs = useCallback(async () => {
    if (!activeProject) return [];
    
    try {
      const response = await fetch(`/api/export/list?project_id=${activeProject.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch export jobs');
      }
      
      const data = await response.json();
      return data.jobs as ExportJob[];
      
    } catch (error) {
      console.error('Error fetching export jobs:', error);
      return [];
    }
  }, [activeProject]);
  
  return {
    isExporting,
    exportJob,
    exportProgress,
    exportError,
    startExport,
    getExportJobs
  };
}
