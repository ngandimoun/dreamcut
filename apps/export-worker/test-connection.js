require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Test Supabase connection
async function testConnection() {
  console.log('Testing Supabase connection...');
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  
  console.log('Environment variables:', {
    supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
    serviceKey: serviceKey ? 'Set' : 'Missing'
  });
  
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing required environment variables');
    return;
  }
  
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // Test database connection
    console.log('Testing database connection...');
    const { data: jobs, error: dbError } = await supabase
      .from('export_jobs')
      .select('count')
      .limit(1);
    
    if (dbError) {
      console.error('Database connection failed:', dbError);
    } else {
      console.log('✅ Database connection successful');
    }
    
    // Test storage connection
    console.log('Testing storage connection...');
    const { data: buckets, error: storageError } = await supabase
      .storage
      .listBuckets();
    
    if (storageError) {
      console.error('Storage connection failed:', storageError);
    } else {
      console.log('✅ Storage connection successful');
      console.log('Available buckets:', buckets.map(b => b.id));
    }
    
    // Test export_data bucket access
    console.log('Testing export_data bucket access...');
    const { data: files, error: listError } = await supabase
      .storage
      .from('export_data')
      .list();
    
    if (listError) {
      console.error('export_data bucket access failed:', listError);
    } else {
      console.log('✅ export_data bucket access successful');
      console.log('Files in export_data:', files.map(f => f.name));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testConnection();
