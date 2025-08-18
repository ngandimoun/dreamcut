/**
 * Create export tables and storage buckets manually
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fpfvyzeqcxpbiufhfkbr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZnZ5emVxY3hwYml1Zmhma2JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM3NjI2NywiZXhwIjoyMDcwOTUyMjY3fQ.XPznR3YgtxEP_SsaEtChT2_umxFPPnfjdjsXX_vP5tM';

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createExportSystem() {
  try {
    console.log('Creating export system...');

    // 1. Create export_jobs table
    console.log('Creating export_jobs table...');
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS export_jobs (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          project_id UUID NOT NULL,
          status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          fps INTEGER NOT NULL,
          duration FLOAT NOT NULL,
          progress INTEGER DEFAULT 0,
          download_url TEXT,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE
        );
      `
    });

    if (tableError) {
      console.error('Error creating export_jobs table:', tableError);
    } else {
      console.log('export_jobs table created successfully');
    }

    // 2. Create indexes
    console.log('Creating indexes...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS export_jobs_user_id_idx ON export_jobs(user_id);
        CREATE INDEX IF NOT EXISTS export_jobs_project_id_idx ON export_jobs(project_id);
      `
    });

    if (indexError) {
      console.error('Error creating indexes:', indexError);
    } else {
      console.log('Indexes created successfully');
    }

    // 3. Enable RLS
    console.log('Enabling RLS...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError) {
      console.error('Error enabling RLS:', rlsError);
    } else {
      console.log('RLS enabled successfully');
    }

    // 4. Create RLS policies
    console.log('Creating RLS policies...');
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY export_jobs_select_policy ON export_jobs
          FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY export_jobs_insert_policy ON export_jobs
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY export_jobs_update_policy ON export_jobs
          FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY export_jobs_delete_policy ON export_jobs
          FOR DELETE USING (auth.uid() = user_id);
      `
    });

    if (policyError) {
      console.error('Error creating policies:', policyError);
    } else {
      console.log('RLS policies created successfully');
    }

    // 5. Create storage buckets
    console.log('Creating storage buckets...');
    const { error: bucketError } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('export_data', 'export_data', false)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO storage.buckets (id, name, public)
        VALUES ('exports', 'exports', false)
        ON CONFLICT (id) DO NOTHING;
      `
    });

    if (bucketError) {
      console.error('Error creating storage buckets:', bucketError);
    } else {
      console.log('Storage buckets created successfully');
    }

    // 6. Create storage policies
    console.log('Creating storage policies...');
    const { error: storagePolicyError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY export_data_select_policy ON storage.objects
          FOR SELECT USING (
            bucket_id = 'export_data' AND 
            (storage.foldername(name))[1] = auth.uid()::text
          );

        CREATE POLICY export_data_insert_policy ON storage.objects
          FOR INSERT WITH CHECK (
            bucket_id = 'export_data' AND 
            (storage.foldername(name))[1] = auth.uid()::text
          );

        CREATE POLICY exports_select_policy ON storage.objects
          FOR SELECT USING (
            bucket_id = 'exports' AND 
            (storage.foldername(name))[1] = auth.uid()::text
          );

        CREATE POLICY exports_insert_policy ON storage.objects
          FOR INSERT WITH CHECK (
            bucket_id = 'exports' AND 
            (storage.foldername(name))[1] = auth.uid()::text
          );
      `
    });

    if (storagePolicyError) {
      console.error('Error creating storage policies:', storagePolicyError);
    } else {
      console.log('Storage policies created successfully');
    }

    // 7. Verify everything was created
    console.log('Verifying setup...');
    
    // Check if table exists
    const { data: jobs, error: verifyTableError } = await supabase
      .from('export_jobs')
      .select('count')
      .limit(1);

    if (verifyTableError) {
      console.error('Error verifying export_jobs table:', verifyTableError);
    } else {
      console.log('export_jobs table is accessible');
    }

    // Check if buckets exist
    const { data: buckets, error: verifyBucketError } = await supabase
      .storage
      .listBuckets();

    if (verifyBucketError) {
      console.error('Error verifying storage buckets:', verifyBucketError);
    } else {
      const exportBuckets = buckets.filter(bucket => 
        bucket.id === 'export_data' || bucket.id === 'exports'
      );
      console.log('Found export buckets:', exportBuckets.map(b => b.id));
    }

    console.log('Export system setup completed!');
  } catch (error) {
    console.error('Error creating export system:', error);
  }
}

createExportSystem();
