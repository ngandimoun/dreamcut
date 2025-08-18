/**
 * Check export jobs and debug the issue
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fpfvyzeqcxpbiufhfkbr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZnZ5emVxY3hwYml1Zmhma2JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM3NjI2NywiZXhwIjoyMDcwOTUyMjY3fQ.XPznR3YgtxEP_SsaEtChT2_umxFPPnfjdjsXX_vP5tM';

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkExportJobs() {
  try {
    console.log('Checking export jobs...');

    // Get all export jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('export_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('Error fetching export jobs:', jobsError);
      return;
    }

    console.log(`Found ${jobs.length} export jobs:`);
    jobs.forEach(job => {
      console.log(`- Job ${job.id}: ${job.status} (${job.error_message || 'no error'})`);
    });

    // Check if there are any failed jobs
    const failedJobs = jobs.filter(job => job.status === 'failed');
    if (failedJobs.length > 0) {
      console.log('\nFailed jobs:');
      failedJobs.forEach(job => {
        console.log(`- Job ${job.id}: ${job.error_message}`);
      });
    }

    // Check storage buckets
    console.log('\nChecking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    } else {
      console.log('Available buckets:', buckets.map(b => b.id));
    }

    // Check if there are any files in export_data bucket
    console.log('\nChecking export_data bucket contents...');
    const { data: exportDataFiles, error: exportDataError } = await supabase
      .storage
      .from('export_data')
      .list('', { limit: 100 });

    if (exportDataError) {
      console.error('Error listing export_data files:', exportDataError);
    } else {
      console.log(`Found ${exportDataFiles.length} files in export_data bucket:`);
      exportDataFiles.forEach(file => {
        console.log(`- ${file.name}`);
      });
    }

    // Check if there are any files in exports bucket
    console.log('\nChecking exports bucket contents...');
    const { data: exportFiles, error: exportError } = await supabase
      .storage
      .from('exports')
      .list('', { limit: 100 });

    if (exportError) {
      console.error('Error listing exports files:', exportError);
    } else {
      console.log(`Found ${exportFiles.length} files in exports bucket:`);
      exportFiles.forEach(file => {
        console.log(`- ${file.name}`);
      });
    }

  } catch (error) {
    console.error('Error checking export jobs:', error);
  }
}

checkExportJobs();
