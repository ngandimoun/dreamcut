import { useState, useCallback, useRef, useEffect } from 'react';
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
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);
  
  // Get data from stores
  const tracks = useTimelineStore(state => state.tracks);
  const activeProject = useProjectStore(state => state.activeProject);
  const mediaItems = useMediaStore(state => state.mediaItems);
  
  // Convert blob URLs to base64 data for export
  const convertMediaItemsForExport = useCallback(async (mediaItems: typeof mediaItems) => {
    const convertedMediaItems: Record<string, any> = {};
    
    for (const item of mediaItems) {
      try {
        // If the URL is already a public URL (not a blob), use it as is
        if (item.url && !item.url.startsWith('blob:') && !item.url.startsWith('data:')) {
          convertedMediaItems[item.id] = {
            ...item,
            url: item.url
          };
          continue;
        }
        
        // Convert blob URL to base64 data
        if (item.url && item.url.startsWith('blob:')) {
          const response = await fetch(item.url);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          
          convertedMediaItems[item.id] = {
            ...item,
            url: `data:${blob.type};base64,${base64}`,
            // Remove the file object as it's not needed for export
            file: undefined
          };
        } else {
          // For data URLs, use as is
          convertedMediaItems[item.id] = {
            ...item,
            file: undefined
          };
        }
      } catch (error) {
        console.error(`Failed to convert media item ${item.id}:`, error);
        // If conversion fails, try to use the original URL
        convertedMediaItems[item.id] = {
          ...item,
          file: undefined
        };
      }
    }
    
    return convertedMediaItems;
  }, []);
  
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
      
      // Convert media items to base64 data
      const convertedMediaItems = await convertMediaItemsForExport(mediaItems);
      
      // Prepare the export request
      const exportRequest = {
        project_id: activeProject.id,
        timeline_data: {
          project: activeProject,
          tracks,
          mediaItems: convertedMediaItems
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
    } finally {
      setIsExporting(false);
    }
  }, [activeProject, tracks, mediaItems, convertMediaItemsForExport, toast]);
  
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
      errorCountRef.current = 0; // Reset error count on success
      
      // Check if the job is still processing
      if (job.status === 'processing' || job.status === 'queued') {
        // Continue polling with longer intervals to reduce memory usage
        pollingTimeoutRef.current = setTimeout(() => pollJobStatus(jobId), 5000);
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
      errorCountRef.current += 1;
      
      // Stop polling after too many errors to prevent memory leaks
      if (errorCountRef.current < 5) {
        pollingTimeoutRef.current = setTimeout(() => pollJobStatus(jobId), 10000);
      } else {
        setIsExporting(false);
        setExportError('Failed to check export status. Please refresh the page.');
        toast({
          title: "Export status error",
          description: "Unable to check export status. Please refresh the page.",
          variant: "destructive"
        });
      }
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
