-- Create storage buckets for export data based on environment variables
-- This migration ensures all the necessary buckets exist for the export functionality

-- Create videos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', false)
ON CONFLICT (id) DO NOTHING;

-- Create documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', false)
ON CONFLICT (id) DO NOTHING;

-- Create images2 bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('images2', 'images2', false)
ON CONFLICT (id) DO NOTHING;

-- Create ttsaudio bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('ttsaudio', 'ttsaudio', false)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies for the buckets

-- Videos bucket policies
CREATE POLICY videos_select_policy ON storage.objects
  FOR SELECT USING (
    bucket_id = 'videos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY videos_insert_policy ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'videos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Documents bucket policies
CREATE POLICY documents_select_policy ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY documents_insert_policy ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Images bucket policies
CREATE POLICY images_select_policy ON storage.objects
  FOR SELECT USING (
    bucket_id = 'images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY images_insert_policy ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Images2 bucket policies
CREATE POLICY images2_select_policy ON storage.objects
  FOR SELECT USING (
    bucket_id = 'images2' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY images2_insert_policy ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'images2' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- TTS Audio bucket policies
CREATE POLICY ttsaudio_select_policy ON storage.objects
  FOR SELECT USING (
    bucket_id = 'ttsaudio' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY ttsaudio_insert_policy ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ttsaudio' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );
