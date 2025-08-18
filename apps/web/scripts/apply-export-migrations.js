/**
 * Apply export system migrations to Supabase
 * 
 * This script applies the export system migrations directly using the Supabase JS client
 * It requires SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Applying export system migrations to Supabase...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'export_system_setup.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Split the migration into individual statements
    const statements = migrationSql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // Apply each statement
    for (const statement of statements) {
      console.log(`Executing SQL: ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('pgtle_install_extension', {
        statement: statement + ';'
      });
      
      if (error) {
        console.error('Error applying migration statement:', error);
      }
    }

    // Verify the export_jobs table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'export_jobs')
      .single();

    if (tableError) {
      console.error('Error verifying export_jobs table:', tableError);
    } else {
      console.log('export_jobs table exists:', !!tableExists);
    }

    // Verify the storage buckets exist
    const { data: buckets, error: bucketsError } = await supabase
      .from('storage.buckets')
      .select('id, name')
      .in('id', ['export_data', 'exports']);

    if (bucketsError) {
      console.error('Error verifying storage buckets:', bucketsError);
    } else {
      console.log('Storage buckets:', buckets);
    }

    console.log('Migration completed!');
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

applyMigration();
