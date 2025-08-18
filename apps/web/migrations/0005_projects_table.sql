-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  thumbnail TEXT,
  background_color TEXT DEFAULT '#000000',
  background_type TEXT DEFAULT 'color',
  blur_intensity INTEGER DEFAULT 8,
  bookmarks JSONB DEFAULT '[]',
  fps INTEGER DEFAULT 30,
  canvas_size JSONB NOT NULL DEFAULT '{"width": 1920, "height": 1080}',
  canvas_mode TEXT DEFAULT 'preset',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY projects_select_policy ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY projects_insert_policy ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY projects_update_policy ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY projects_delete_policy ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
