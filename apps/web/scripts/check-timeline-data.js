/**
 * Check timeline data for a specific job
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fpfvyzeqcxpbiufhfkbr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZnZ5emVxY3hwYml1Zmhma2JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM3NjI2NywiZXhwIjoyMDcwOTUyMjY3fQ.XPznR3YgtxEP_SsaEtChT2_umxFPPnfjdjsXX_vP5tM';

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTimelineData() {
  try {
    console.log('Checking timeline data for failed jobs...');

    // Get the failed job
    const jobId = '5a4e5d11-79d5-45cb-8e93-d74baf42a018';
    
    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) {
      console.error('Error fetching job:', jobError);
      return;
    }

    console.log('Job details:', {
      id: job.id,
      user_id: job.user_id,
      status: job.status,
      error_message: job.error_message
    });

    // Check if timeline data file exists
    const timelinePath = `${job.user_id}/${jobId}/timeline.json`;
    console.log('Looking for timeline data at:', timelinePath);

    const { data: timelineData, error: downloadError } = await supabase
      .storage
      .from('export_data')
      .download(timelinePath);

    if (downloadError) {
      console.error('Error downloading timeline data:', downloadError);
      
      // List files in the user directory
      const { data: userFiles, error: listError } = await supabase
        .storage
        .from('export_data')
        .list(job.user_id);

      if (listError) {
        console.error('Error listing user files:', listError);
      } else {
        console.log('Files in user directory:', userFiles);
      }
    } else {
      console.log('Timeline data found!');
      const timelineText = await timelineData.text();
      const timeline = JSON.parse(timelineText);
      console.log('Timeline data preview:', {
        project: timeline.project ? 'exists' : 'missing',
        tracks: timeline.tracks ? timeline.tracks.length : 'missing',
        mediaItems: timeline.mediaItems ? Object.keys(timeline.mediaItems).length : 'missing'
      });
    }

  } catch (error) {
    console.error('Error checking timeline data:', error);
  }
}

checkTimelineData();
