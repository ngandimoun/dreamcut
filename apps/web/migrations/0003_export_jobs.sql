-- Create export_jobs table
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

-- Add index for faster lookups by user
CREATE INDEX IF NOT EXISTS export_jobs_user_id_idx ON export_jobs(user_id);

-- Add index for project lookups
CREATE INDEX IF NOT EXISTS export_jobs_project_id_idx ON export_jobs(project_id);

-- Add RLS policies
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own export jobs
CREATE POLICY export_jobs_select_policy ON export_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own export jobs
CREATE POLICY export_jobs_insert_policy ON export_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own export jobs
CREATE POLICY export_jobs_update_policy ON export_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own export jobs
CREATE POLICY export_jobs_delete_policy ON export_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage buckets for export data
INSERT INTO storage.buckets (id, name, public)
VALUES ('export_data', 'export_data', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies
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
