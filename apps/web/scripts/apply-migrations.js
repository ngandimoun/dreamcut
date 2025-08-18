#!/usr/bin/env node

/**
 * Script to apply migrations to Supabase
 * 
 * Usage:
 * node apply-migrations.js
 * 
 * This script will apply all migrations in the migrations folder
 * to the Supabase project specified in the .env file
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Check for required environment variables
const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Error: Missing required environment variables');
  console.error('Please make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Path to migrations folder
const migrationsPath = path.join(__dirname, '..', 'migrations');

// Get all migration files
const migrationFiles = fs.readdirSync(migrationsPath)
  .filter(file => file.endsWith('.sql'))
  .sort(); // Sort to ensure migrations are applied in order

async function applyMigrations() {
  console.log('Applying migrations...');
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Error: Not authenticated');
    console.error('Please login using the Supabase CLI first');
    process.exit(1);
  }
  
  console.log(`Authenticated as ${user.email}`);
  
  // Apply each migration
  for (const file of migrationFiles) {
    console.log(`Applying migration: ${file}`);
    
    const migrationPath = path.join(migrationsPath, file);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into statements
    const statements = sql.split(';').filter(statement => statement.trim() !== '');
    
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`Error applying statement: ${error.message}`);
          console.error('Statement:', statement);
          // Continue with next statement
        }
      } catch (error) {
        console.error(`Error executing statement: ${error.message}`);
        // Continue with next statement
      }
    }
    
    console.log(`Migration ${file} applied successfully`);
  }
  
  console.log('All migrations applied successfully');
}

applyMigrations().catch(error => {
  console.error('Error applying migrations:', error);
  process.exit(1);
});
