/**
 * Check Supabase Storage Buckets
 * 
 * This script checks if the required storage buckets exist in your Supabase project
 * and creates them if they don't.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Required buckets for the export system
const requiredBuckets = [
  { id: 'export_data', public: false },
  { id: 'exports', public: false }
];

async function checkBuckets() {
  console.log('Checking Supabase storage buckets...');
  
  try {
    // Get all existing buckets
    const { data: existingBuckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return;
    }
    
    console.log(`Found ${existingBuckets.length} existing buckets`);
    
    // Check each required bucket
    for (const bucket of requiredBuckets) {
      const bucketExists = existingBuckets.some(b => b.name === bucket.id);
      
      if (bucketExists) {
        console.log(`✅ Bucket '${bucket.id}' already exists`);
        
        // Check policies
        await checkBucketPolicies(bucket.id);
      } else {
        console.log(`⚠️ Bucket '${bucket.id}' does not exist, creating...`);
        
        // Create the bucket
        const { error: createError } = await supabase.storage.createBucket(bucket.id, {
          public: bucket.public
        });
        
        if (createError) {
          console.error(`Error creating bucket '${bucket.id}':`, createError);
        } else {
          console.log(`✅ Created bucket '${bucket.id}'`);
          
          // Create policies
          await createBucketPolicies(bucket.id);
        }
      }
    }
    
    console.log('\nStorage bucket check completed!');
  } catch (error) {
    console.error('Error checking buckets:', error);
  }
}

async function checkBucketPolicies(bucketId) {
  try {
    // We can't directly check policies with the JS client
    // Instead, try to upload a test file to verify permissions
    const testFile = new Uint8Array([0, 1, 2, 3]);
    const testPath = `test/${Date.now()}.bin`;
    
    const { error: uploadError } = await supabase.storage
      .from(bucketId)
      .upload(testPath, testFile);
    
    if (uploadError) {
      console.warn(`⚠️ Could not verify policies for bucket '${bucketId}'`);
      console.warn('   You may need to manually create RLS policies');
    } else {
      console.log(`✅ Policies for bucket '${bucketId}' seem to be working`);
      
      // Clean up test file
      await supabase.storage.from(bucketId).remove([testPath]);
    }
  } catch (error) {
    console.error(`Error checking policies for bucket '${bucketId}':`, error);
  }
}

async function createBucketPolicies(bucketId) {
  console.log(`ℹ️ For bucket '${bucketId}', you need to create the following policies:`);
  console.log(`
-- ${bucketId} bucket policies
CREATE POLICY ${bucketId}_select_policy ON storage.objects
  FOR SELECT USING (
    bucket_id = '${bucketId}' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY ${bucketId}_insert_policy ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = '${bucketId}' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );
`);
  console.log('Please run these SQL commands in the Supabase SQL Editor');
}

// Run the check
checkBuckets();
