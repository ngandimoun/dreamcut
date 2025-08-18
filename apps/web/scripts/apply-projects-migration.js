const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fpfvyzeqcxpbiufhfkbr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZnZ5emVxY3hwYml1Zmhma2JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM3NjI2NywiZXhwIjoyMDcwOTUyMjY3fQ.XPznR3YgtxEP_SsaEtChT2_umxFPPnfjdjsXX_vP5tM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyProjectsMigration() {
  console.log('Applying projects table migration...');

  try {
    // Create projects table
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (createTableError) {
      console.error('Error creating projects table:', createTableError);
      return;
    }

    // Add indexes
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
        CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects(updated_at DESC);
      `
    });

    if (indexError) {
      console.error('Error creating indexes:', indexError);
      return;
    }

    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE projects ENABLE ROW LEVEL SECURITY;'
    });

    if (rlsError) {
      console.error('Error enabling RLS:', rlsError);
      return;
    }

    // Create RLS policies
    const policies = [
      `CREATE POLICY projects_select_policy ON projects FOR SELECT USING (auth.uid() = user_id);`,
      `CREATE POLICY projects_insert_policy ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);`,
      `CREATE POLICY projects_update_policy ON projects FOR UPDATE USING (auth.uid() = user_id);`,
      `CREATE POLICY projects_delete_policy ON projects FOR DELETE USING (auth.uid() = user_id);`
    ];

    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('exec_sql', { sql: policy });
      if (policyError) {
        console.error('Error creating policy:', policyError);
        return;
      }
    }

    // Create function to update updated_at
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `
    });

    if (functionError) {
      console.error('Error creating function:', functionError);
      return;
    }

    // Create trigger
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TRIGGER update_projects_updated_at
          BEFORE UPDATE ON projects
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `
    });

    if (triggerError) {
      console.error('Error creating trigger:', triggerError);
      return;
    }

    console.log('Projects table migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

applyProjectsMigration();
