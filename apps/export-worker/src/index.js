require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

// Load environment variables with fallbacks
const config = {
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_KEY,
  },
  worker: {
    port: parseInt(process.env.PORT || '3000'),
    pollInterval: parseInt(process.env.POLL_INTERVAL || '10000'),
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '2'),
    tempDir: process.env.TEMP_DIR || '/tmp/opencut-exports'
  }
};

// Validate required configuration
if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  console.error('Missing required environment variables:');
  if (!config.supabase.url) console.error('- SUPABASE_URL');
  if (!config.supabase.serviceRoleKey) console.error('- SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Initialize Express app
const app = express();

// Initialize Supabase client with service role key
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Use settings from config
const { port: PORT, pollInterval: POLL_INTERVAL, maxConcurrentJobs: MAX_CONCURRENT_JOBS, tempDir: TEMP_DIR } = config.worker;

// Use a different port for local development to avoid conflicts
const SERVER_PORT = (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ? 0 : PORT;

console.log('Export Worker Configuration:', {
  supabaseUrl: config.supabase.url,
  hasServiceKey: !!config.supabase.serviceRoleKey,
  serviceKeyType: typeof config.supabase.serviceRoleKey,
  port: PORT,
  serverPort: SERVER_PORT,
  nodeEnv: process.env.NODE_ENV,
  tempDir: TEMP_DIR,
  pollInterval: POLL_INTERVAL,
  maxConcurrentJobs: MAX_CONCURRENT_JOBS
});

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Track active jobs
const activeJobs = new Map();

/**
 * Main polling function to check for new jobs
 */
async function pollForJobs() {
  try {
    // Only poll if we have capacity
    if (activeJobs.size >= MAX_CONCURRENT_JOBS) {
      console.log(`At max capacity (${activeJobs.size}/${MAX_CONCURRENT_JOBS}), waiting...`);
      return;
    }

    console.log('Polling for new export jobs...');
    
    // Get next queued job
    const { data: jobs, error } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1);
      
    if (error) {
      console.error('Error fetching jobs:', error);
      return;
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('No pending jobs found');
      return;
    }
    
    const job = jobs[0];
    
    // Mark job as processing
    const { error: updateError } = await supabase
      .from('export_jobs')
      .update({ status: 'processing', progress: 0 })
      .eq('id', job.id);
      
    if (updateError) {
      console.error(`Error updating job ${job.id} status:`, updateError);
      return;
    }
    
    console.log(`Starting to process job ${job.id} for project ${job.project_id}`);
    
    // Process the job
    await processJob(job);
    
  } catch (error) {
    console.error('Error in poll cycle:', error);
  }
}

/**
 * Process a single export job
 */
async function processJob(job) {
  const jobId = job.id;
  const userId = job.user_id;
  
  // Add to active jobs
  activeJobs.set(jobId, job);
  
  try {
    // Create a job directory
    const jobDir = path.join(TEMP_DIR, jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }
    
    // Download the timeline data
    console.log('Attempting to download timeline data:', {
      bucket: 'export_data',
      path: `${userId}/${jobId}/timeline.json`,
      userId,
      jobId
    });

    // First, check if the file exists
    const { data: fileList, error: listError } = await supabase
      .storage
      .from('export_data')
      .list(userId);

    if (listError) {
      console.error('Error listing files in user directory:', {
        error: listError,
        userId,
        bucket: 'export_data'
      });
    } else {
      console.log('Files in user directory:', {
        files: fileList.map(f => f.name),
        count: fileList.length,
        userId
      });
    }

    // Try to list the specific file
    const { data: fileInfo, error: fileError } = await supabase
      .storage
      .from('export_data')
      .list(`${userId}/${jobId}`);

    console.log('Looking for timeline file:', {
      path: `${userId}/${jobId}`,
      files: fileInfo?.map(f => f.name),
      error: fileError?.message
    });

    // Try to download the file
    const { data: timelineData, error: downloadError } = await supabase
      .storage
      .from('export_data')
      .download(`${userId}/${jobId}/timeline.json`);
      
    if (downloadError) {
      console.error('Timeline download error:', {
        message: downloadError.message,
        error: downloadError,
        path: `${userId}/${jobId}/timeline.json`,
        supabaseUrl: config.supabase.url,
        hasServiceKey: !!config.supabase.serviceRoleKey,
        serviceKeyType: typeof config.supabase.serviceRoleKey,
        errorCode: downloadError.code,
        errorDetails: downloadError.details,
        statusCode: downloadError.statusCode
      });

      // Try alternative path without userId (in case the file was stored differently)
      console.log('Trying alternative path...');
      const { data: altData, error: altError } = await supabase
        .storage
        .from('export_data')
        .download(`${jobId}/timeline.json`);

      if (altError) {
        console.error('Alternative path failed:', {
          error: altError,
          path: `${jobId}/timeline.json`,
          originalPath: `${userId}/${jobId}/timeline.json`
        });

        // Try listing the root directory to see what's available
        const { data: rootFiles, error: rootError } = await supabase
          .storage
          .from('export_data')
          .list();

        console.log('Root directory contents:', {
          files: rootFiles?.map(f => f.name),
          error: rootError?.message,
          rootFilesStructure: rootFiles?.map(f => ({ name: f.name, type: f.type, id: f.id }))
        });

        // If we have user directories, try to find the job in any of them
        if (rootFiles && rootFiles.length > 0) {
          console.log('Searching for job in user directories...');
          console.log('Available user directories:', rootFiles.map(f => f.name));
          
          for (const userDir of rootFiles) {
            console.log(`Processing userDir:`, userDir);
            if (userDir.name) {
              console.log(`Checking user directory: ${userDir.name}`);
              const { data: userJobFiles, error: userJobError } = await supabase
                .storage
                .from('export_data')
                .list(`${userDir.name}/${jobId}`);
              
              console.log(`Job files in ${userDir.name}/${jobId}:`, {
                files: userJobFiles?.map(f => f.name),
                error: userJobError?.message
              });
              
              if (!userJobError && userJobFiles && userJobFiles.length > 0) {
                console.log(`Found job in user directory: ${userDir.name}`);
                const { data: foundData, error: foundError } = await supabase
                  .storage
                  .from('export_data')
                  .download(`${userDir.name}/${jobId}/timeline.json`);
                
                if (!foundError) {
                  console.log(`Successfully downloaded from: ${userDir.name}/${jobId}/timeline.json`);
                  timelineData = foundData;
                  break;
                } else {
                  console.log(`Failed to download from ${userDir.name}/${jobId}/timeline.json:`, foundError);
                }
              }
            }
          }
        }

        // If we still don't have timelineData, throw the error
        if (!timelineData) {
          throw new Error(`Failed to download timeline data: ${JSON.stringify({
            message: downloadError.message,
            code: downloadError.code,
            details: downloadError.details,
            statusCode: downloadError.statusCode,
            altError: altError?.message
          })}`);
        }
      } else {
        // Use the alternative data if successful
        timelineData = altData;
      }
    }
    
    // Parse the timeline data
    const timelineJson = await timelineData.text();
    const timeline = JSON.parse(timelineJson);
    
    // Download all media files referenced in the timeline
    await downloadMediaFiles(timeline, jobDir, userId);
    
    // Generate FFmpeg command
    const ffmpegCommand = buildFfmpegCommand(timeline, jobDir);
    
    // Output file path
    const outputFilePath = path.join(jobDir, `${jobId}.mp4`);
    
    // Execute FFmpeg
    await executeFFmpeg(ffmpegCommand, outputFilePath, job);
    
    // Upload the result to Supabase
    const fileStream = fs.createReadStream(outputFilePath);
    const { error: uploadError } = await supabase
      .storage
      .from('exports')
      .upload(`${userId}/${jobId}/export.mp4`, fileStream, {
        contentType: 'video/mp4',
        upsert: true
      });
      
    if (uploadError) {
      throw new Error(`Failed to upload export: ${uploadError.message}`);
    }
    
    // Get the download URL
    const { data: urlData } = await supabase
      .storage
      .from('exports')
      .createSignedUrl(`${userId}/${jobId}/export.mp4`, 60 * 60 * 24 * 7); // 7 days
    
    // Update job status to completed
    await supabase
      .from('export_jobs')
      .update({
        status: 'completed',
        progress: 100,
        download_url: urlData.signedUrl,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
      
    console.log(`Job ${jobId} completed successfully`);
    
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
    
    // Update job status to failed
    await supabase
      .from('export_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  } finally {
    // Remove from active jobs
    activeJobs.delete(jobId);
    
    // Clean up temporary files
    try {
      const jobDir = path.join(TEMP_DIR, jobId);
      fs.rmSync(jobDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error(`Error cleaning up job ${jobId}:`, cleanupError);
    }
  }
}

/**
 * Download all media files referenced in the timeline
 */
async function downloadMediaFiles(timeline, jobDir, userId) {
  console.log('Starting media file downloads:', {
    mediaItemCount: Object.keys(timeline.mediaItems || {}).length,
    jobDir,
    userId
  });

  const mediaItems = timeline.mediaItems || {};
  const mediaPromises = [];
  
  // Create a map to store file paths for each media ID
  const mediaFilePaths = new Map();

  console.log('Media items to process:', Object.entries(mediaItems).map(([id, item]) => ({
    id,
    type: item.type,
    hasUrl: !!item.url,
    urlType: item.url ? (
      item.url.startsWith('data:') ? 'data-url' :
      item.url.startsWith('blob:') ? 'blob-url' :
      'regular-url'
    ) : 'none'
  })));
  
  for (const [mediaId, mediaItem] of Object.entries(mediaItems)) {
    if (!mediaItem.url) continue;
    
    // Extract the file path from the URL
    const urlParts = mediaItem.url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const fileExt = path.extname(fileName);
    
    // Create a unique file name
    const localFileName = `${mediaId}${fileExt}`;
    const localFilePath = path.join(jobDir, localFileName);
    
    // Store the local file path
    mediaFilePaths.set(mediaId, localFilePath);
    
    // Download the file
    const promise = downloadMediaFile(mediaItem.url, localFilePath);
    mediaPromises.push(promise);
  }
  
  // Wait for all downloads to complete
  await Promise.all(mediaPromises);
  
  // Update the timeline with local file paths
  for (const [mediaId, localFilePath] of mediaFilePaths.entries()) {
    if (mediaItems[mediaId]) {
      mediaItems[mediaId].url = localFilePath;
    }
  }
  
  return timeline;
}

/**
 * Download a single media file
 */
async function downloadMediaFile(url, filePath) {
  return new Promise((resolve, reject) => {
    console.log('Downloading media file:', {
      url: url.substring(0, 50) + '...',  // Truncate URL for logging
      filePath,
      urlType: url.startsWith('data:') ? 'data-url' :
               url.startsWith('blob:') ? 'blob-url' : 'regular-url'
    });

    // Handle different URL types
    if (url.startsWith('data:')) {
      // Handle data URLs (base64 encoded files)
      try {
        const [, mimeType, base64Data] = url.match(/^data:([^;]+);base64,(.+)$/);
        console.log('Processing data URL:', { mimeType });
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);
        console.log('Successfully saved data URL to file:', { filePath });
        resolve(filePath);
      } catch (error) {
        console.error('Failed to process data URL:', {
          error: error.message,
          stack: error.stack,
          filePath
        });
        reject(new Error(`Failed to decode data URL: ${error.message}`));
      }
      return;
    }
    
    if (url.startsWith('blob:')) {
      // For blob URLs, we can't download directly
      console.error('Blob URL detected:', {
        url: url.substring(0, 50) + '...',
        filePath
      });
      reject(new Error(`Cannot download blob URL: ${url}`));
      return;
    }
    
    // For regular URLs, download with fetch
    console.log('Fetching URL:', {
      url: url.substring(0, 50) + '...',
      filePath
    });

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText} (${response.status})`);
        }
        console.log('Fetch response received:', {
          status: response.status,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        });
        return response.buffer();
      })
      .then(buffer => {
        console.log('Writing buffer to file:', {
          filePath,
          bufferSize: buffer.length
        });
        fs.writeFileSync(filePath, buffer);
        console.log('Successfully saved file:', { filePath });
        resolve(filePath);
      })
      .catch(error => {
        console.error('Failed to download file:', {
          error: error.message,
          stack: error.stack,
          url: url.substring(0, 50) + '...',
          filePath
        });
        reject(error);
      });
  });
}

/**
 * Build FFmpeg command from timeline data
 */
function buildFfmpegCommand(timeline, jobDir) {
  // Import the timeline-to-ffmpeg converter
  const { buildFfmpegFromTimeline } = require('./timeline-to-ffmpeg');
  
  // Build the command
  const { args } = buildFfmpegFromTimeline(timeline);
  
  return args;
}

/**
 * Execute FFmpeg command
 */
function executeFFmpeg(args, outputFilePath, job) {
  return new Promise((resolve, reject) => {
    // Add output file path to args
    const fullArgs = [...args, outputFilePath];
    
    console.log(`Executing FFmpeg command: ffmpeg ${fullArgs.join(' ')}`);
    
    // Spawn FFmpeg process
    const ffmpeg = spawn('ffmpeg', fullArgs);
    
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      
      // Try to parse progress
      try {
        // Look for time=XX:XX:XX.XX pattern
        const timeMatch = chunk.match(/time=(\d+:\d+:\d+\.\d+)/);
        if (timeMatch) {
          const timeStr = timeMatch[1];
          const [hours, minutes, seconds] = timeStr.split(':').map(parseFloat);
          const currentTime = hours * 3600 + minutes * 60 + seconds;
          const progress = Math.min(99, Math.round((currentTime / job.duration) * 100));
          
          // Update job progress
          updateJobProgress(job.id, progress);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputFilePath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
      }
    });
    
    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg process error: ${err.message}`));
    });
  });
}

/**
 * Update job progress in the database
 */
async function updateJobProgress(jobId, progress) {
  try {
    await supabase
      .from('export_jobs')
      .update({ progress })
      .eq('id', jobId);
  } catch (error) {
    console.error(`Error updating job ${jobId} progress:`, error);
  }
}

// API routes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    activeJobs: Array.from(activeJobs.keys()),
    version: '1.0.0'
  });
});

app.post('/webhook/new-job', (req, res) => {
  console.log('Received webhook notification for new job');
  pollForJobs();
  res.status(200).send('OK');
});

// Start the server
app.listen(SERVER_PORT, () => {
  console.log(`Export worker server running on port ${SERVER_PORT}`);
  
  // Start polling
  console.log('Export job polling starting...');
  setInterval(pollForJobs, POLL_INTERVAL);
  
  // Initial poll
  pollForJobs();
});