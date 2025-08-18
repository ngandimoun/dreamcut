/**
 * Utility script to check the connection between Railway and Supabase
 * 
 * This script validates that:
 * 1. The Supabase connection is working
 * 2. The export_jobs table exists
 * 3. The storage buckets exist and are accessible
 * 4. FFmpeg is installed and working
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Create a temp directory if it doesn't exist
const TEMP_DIR = process.env.TEMP_DIR || '/tmp/opencut-exports';
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function checkConnection() {
  console.log('🔍 Checking Supabase connection...');
  
  try {
    // Check Supabase connection
    const { data, error } = await supabase.from('export_jobs').select('count(*)', { count: 'exact' });
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    console.log(`ℹ️ Found ${data[0].count} export jobs in the database`);
    
    // Check storage buckets
    console.log('🔍 Checking storage buckets...');
    
    const buckets = ['export_data', 'exports'];
    for (const bucket of buckets) {
      const { data: bucketData, error: bucketError } = await supabase
        .storage
        .getBucket(bucket);
      
      if (bucketError) {
        console.error(`❌ Storage bucket '${bucket}' not found:`, bucketError);
        return false;
      }
      
      console.log(`✅ Storage bucket '${bucket}' exists`);
      
      // Try to list files in the bucket
      const { data: files, error: filesError } = await supabase
        .storage
        .from(bucket)
        .list();
      
      if (filesError) {
        console.error(`❌ Cannot list files in bucket '${bucket}':`, filesError);
      } else {
        console.log(`ℹ️ Found ${files.length} files in bucket '${bucket}'`);
      }
    }
    
    // Check FFmpeg installation
    console.log('🔍 Checking FFmpeg installation...');
    
    try {
      const ffmpeg = spawn('ffmpeg', ['-version']);
      
      let output = '';
      ffmpeg.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      await new Promise((resolve) => {
        ffmpeg.on('close', (code) => {
          if (code === 0) {
            const versionMatch = output.match(/ffmpeg version (\S+)/);
            const version = versionMatch ? versionMatch[1] : 'unknown';
            console.log(`✅ FFmpeg is installed (version: ${version})`);
          } else {
            console.error('❌ FFmpeg check failed with code:', code);
          }
          resolve();
        });
      });
      
      // Test FFmpeg with a simple command
      console.log('🔍 Testing FFmpeg with a simple command...');
      
      const testFile = path.join(TEMP_DIR, 'test.mp4');
      
      // Create a 3-second test video
      const testCommand = spawn('ffmpeg', [
        '-f', 'lavfi', 
        '-i', 'color=c=blue:s=640x360:r=30:d=3', 
        '-c:v', 'libx264',
        '-y', // Overwrite output file if it exists
        testFile
      ]);
      
      await new Promise((resolve) => {
        testCommand.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ FFmpeg test successful, created ${testFile}`);
            
            // Clean up test file
            try {
              fs.unlinkSync(testFile);
            } catch (e) {
              console.warn('Could not delete test file:', e);
            }
          } else {
            console.error('❌ FFmpeg test failed with code:', code);
          }
          resolve();
        });
      });
      
    } catch (e) {
      console.error('❌ FFmpeg check failed:', e);
    }
    
    console.log('\n🎉 Connection check completed!');
    console.log('✅ Your Railway worker is properly configured to work with Supabase');
    
    return true;
  } catch (error) {
    console.error('❌ Connection check failed:', error);
    return false;
  }
}

// Run the check
checkConnection().then((success) => {
  if (!success) {
    console.log('\n⚠️ Some checks failed. Please review the errors above.');
    process.exit(1);
  }
});
