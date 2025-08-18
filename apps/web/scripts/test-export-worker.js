/**
 * Test export worker connection
 */

const { createClient } = require('@supabase/supabase-js');

// Use the same credentials as the export worker should have
const supabaseUrl = 'https://fpfvyzeqcxpbiufhfkbr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZnZ5emVxY3hwYml1Zmhma2JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM3NjI2NywiZXhwIjoyMDcwOTUyMjY3fQ.XPznR3YgtxEP_SsaEtChT2_umxFPPnfjdjsXX_vP5tM';

// Initialize Supabase client with service role key (same as export worker)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testExportWorker() {
  try {
    console.log('Testing export worker connection...');

    // Test 1: Check if we can access export_jobs table
    console.log('\n1. Testing export_jobs table access...');
    const { data: jobs, error: jobsError } = await supabase
      .from('export_jobs')
      .select('*')
      .limit(1);

    if (jobsError) {
      console.error('Error accessing export_jobs table:', jobsError);
    } else {
      console.log('✅ Successfully accessed export_jobs table');
    }

    // Test 2: Check if we can access storage buckets
    console.log('\n2. Testing storage bucket access...');
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.error('Error accessing storage buckets:', bucketsError);
    } else {
      console.log('✅ Successfully accessed storage buckets');
      const exportBuckets = buckets.filter(bucket => 
        bucket.id === 'export_data' || bucket.id === 'exports'
      );
      console.log('Export buckets found:', exportBuckets.map(b => b.id));
    }

    // Test 3: Test downloading timeline data for the failed job
    console.log('\n3. Testing timeline data download...');
    const jobId = '5a4e5d11-79d5-45cb-8e93-d74baf42a018';
    const userId = '8c3c9dae-52ab-4838-a17b-58bfde28700f';
    const timelinePath = `${userId}/${jobId}/timeline.json`;

    const { data: timelineData, error: downloadError } = await supabase
      .storage
      .from('export_data')
      .download(timelinePath);

    if (downloadError) {
      console.error('❌ Error downloading timeline data:', downloadError);
      console.log('Error details:', {
        message: downloadError.message,
        statusCode: downloadError.statusCode,
        error: downloadError.error
      });
    } else {
      console.log('✅ Successfully downloaded timeline data');
      const timelineText = await timelineData.text();
      const timeline = JSON.parse(timelineText);
      console.log('Timeline data size:', timelineText.length, 'characters');
      console.log('Timeline structure:', {
        project: !!timeline.project,
        tracks: timeline.tracks ? timeline.tracks.length : 0,
        mediaItems: timeline.mediaItems ? Object.keys(timeline.mediaItems).length : 0
      });
    }

    // Test 4: Test uploading to exports bucket
    console.log('\n4. Testing exports bucket upload...');
    const testData = 'test export data';
    const { error: uploadError } = await supabase
      .storage
      .from('exports')
      .upload(`${userId}/test-upload.txt`, testData, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Error uploading to exports bucket:', uploadError);
    } else {
      console.log('✅ Successfully uploaded to exports bucket');
      
      // Clean up test file
      await supabase
        .storage
        .from('exports')
        .remove([`${userId}/test-upload.txt`]);
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testExportWorker();
