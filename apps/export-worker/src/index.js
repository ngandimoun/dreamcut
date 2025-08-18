require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Settings
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '10000');
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || '2');
const TEMP_DIR = process.env.TEMP_DIR || '/tmp/opencut-exports';

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
    processJob(job);
    
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
    const { data: timelineData, error: downloadError } = await supabase
      .storage
      .from('export_data')
      .download(`${userId}/${jobId}/timeline.json`);
      
    if (downloadError) {
      throw new Error(`Failed to download timeline data: ${downloadError.message}`);
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
  const mediaItems = timeline.mediaItems || {};
  const mediaPromises = [];
  
  // Create a map to store file paths for each media ID
  const mediaFilePaths = new Map();
  
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
    // Handle different URL types
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      // For blob URLs, we can't download directly
      // These should be handled on the frontend before submission
      reject(new Error(`Cannot download blob/data URL: ${url}`));
      return;
    }
    
    // For regular URLs, download with fetch
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }
        return response.buffer();
      })
      .then(buffer => {
        fs.writeFileSync(filePath, buffer);
        resolve(filePath);
      })
      .catch(error => {
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
app.listen(PORT, () => {
  console.log(`Export worker server running on port ${PORT}`);
  
  // Start polling
  console.log('Export job polling starting...');
  setInterval(pollForJobs, POLL_INTERVAL);
  
  // Initial poll
  pollForJobs();
});
