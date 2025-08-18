import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useExport } from "@/hooks/use-export";
import { ExportJob } from "@/lib/export/types";

export function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [recentJobs, setRecentJobs] = useState<ExportJob[]>([]);
  const {
    isExporting,
    exportJob,
    exportProgress,
    exportError,
    startExport,
    getExportJobs,
  } = useExport();

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Load recent export jobs when dialog opens
      const jobs = await getExportJobs();
      setRecentJobs(jobs);
    }
  };

  const handleExport = async () => {
    await startExport();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Export Video</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Export your timeline as a video file.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isExporting ? (
            <div className="space-y-4">
              <div className="text-center font-medium">
                {exportProgress < 100
                  ? "Processing your video..."
                  : "Finalizing export..."}
              </div>
              <Progress value={exportProgress} className="h-2" />
              <div className="text-center text-sm text-muted-foreground">
                {exportProgress}% complete
              </div>
            </div>
          ) : exportJob?.status === "completed" ? (
            <div className="space-y-4">
              <div className="text-center font-medium text-green-600">
                Export completed!
              </div>
              {exportJob.download_url && (
                <div className="flex justify-center">
                  <Button asChild>
                    <a
                      href={exportJob.download_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download Video
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {exportError && (
                <div className="text-center text-red-500">{exportError}</div>
              )}

              {recentJobs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Recent Exports</h3>
                  <div className="max-h-[200px] overflow-y-auto rounded-md border">
                    {recentJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between border-b p-3 last:border-0"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {new Date(job.created_at).toLocaleString()}
                          </span>
                          <span
                            className={`text-xs ${
                              job.status === "completed"
                                ? "text-green-500"
                                : job.status === "failed"
                                ? "text-red-500"
                                : "text-yellow-500"
                            }`}
                          >
                            {job.status.charAt(0).toUpperCase() +
                              job.status.slice(1)}
                          </span>
                        </div>
                        {job.status === "completed" && job.download_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="ml-2"
                          >
                            <a
                              href={job.download_url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Download
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!isExporting && (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? "Exporting..." : "Export"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
