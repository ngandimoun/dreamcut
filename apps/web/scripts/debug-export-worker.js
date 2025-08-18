/**
 * Debug export worker issue by replicating its exact environment
 */

const { createClient } = require('@supabase/supabase-js');

// Use the exact same configuration as the export worker
const supabaseUrl = 'https://fpfvyzeqcxpbiufhfkbr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZnZ5emVxY3hwYml1Zmhma2JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM3NjI2NywiZXhwIjoyMDcwOTUyMjY3fQ.XPznR3YgtxEP_SsaEtChT2_umxFPPnfjdjsXX_vP5tM';

// Initialize Supabase client with service role key (exact same as export worker)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugExportWorker() {
  try {
    console.log('Debugging export worker issue...');

    // Get the failed job details
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

    const userId = job.user_id;
    const timelinePath = `${userId}/${jobId}/timeline.json`;

    console.log('Attempting to download timeline data from:', timelinePath);

    // Replicate the exact same code as the export worker
    const { data: timelineData, error: downloadError } = await supabase
      .storage
      .from('export_data')
      .download(timelinePath);

    console.log('Download result:', {
      hasData: !!timelineData,
      hasError: !!downloadError,
      errorType: downloadError ? typeof downloadError : 'none',
      errorKeys: downloadError ? Object.keys(downloadError) : 'none'
    });

    if (downloadError) {
      console.log('Download error details:', {
        message: downloadError.message,
        statusCode: downloadError.statusCode,
        error: downloadError.error,
        name: downloadError.name,
        stack: downloadError.stack
      });

      // Test what happens when we stringify the error
      console.log('Error message when stringified:', downloadError.message);
      console.log('Error object when stringified:', JSON.stringify(downloadError, null, 2));

      // Test the exact error handling from the export worker
      const errorMessage = `Failed to download timeline data: ${downloadError.message}`;
      console.log('Error message that would be thrown:', errorMessage);
    } else {
      console.log('✅ Successfully downloaded timeline data');
      const timelineText = await timelineData.text();
      console.log('Timeline data size:', timelineText.length, 'characters');
    }

    // Test if we can list files in the user directory
    console.log('\nTesting file listing...');
    const { data: userFiles, error: listError } = await supabase
      .storage
      .from('export_data')
      .list(userId);

    if (listError) {
      console.error('Error listing user files:', listError);
    } else {
      console.log('Files in user directory:', userFiles);
    }

    // Test if we can access the file directly
    console.log('\nTesting direct file access...');
    const { data: fileInfo, error: fileError } = await supabase
      .storage
      .from('export_data')
      .list(userId, {
        search: jobId
      });

    if (fileError) {
      console.error('Error listing job files:', fileError);
    } else {
      console.log('Job files found:', fileInfo);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugExportWorker();
