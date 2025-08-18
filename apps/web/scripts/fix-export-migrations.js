/**
 * Fix export system migrations to Supabase
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
      .filter(statement => statement.length > 0 && !statement.startsWith('--'));

    // Apply each statement using raw SQL
    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      
      console.log(`Executing SQL: ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });
      
      if (error) {
        // Try alternative approach using direct SQL execution
        console.log('Trying alternative SQL execution method...');
        const { error: altError } = await supabase
          .from('_exec_sql')
          .select('*')
          .eq('sql', statement + ';');
          
        if (altError) {
          console.error('Error applying migration statement:', error);
          console.log('Statement was:', statement);
        }
      }
    }

    // Verify the export_jobs table exists by trying to query it
    const { data: jobs, error: tableError } = await supabase
      .from('export_jobs')
      .select('count')
      .limit(1);

    if (tableError) {
      console.error('Error verifying export_jobs table:', tableError);
    } else {
      console.log('export_jobs table exists and is accessible');
    }

    // Verify the storage buckets exist by trying to list them
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.error('Error verifying storage buckets:', bucketsError);
    } else {
      const exportBuckets = buckets.filter(bucket => 
        bucket.id === 'export_data' || bucket.id === 'exports'
      );
      console.log('Found export buckets:', exportBuckets.map(b => b.id));
    }

    console.log('Migration completed!');
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

applyMigration();
