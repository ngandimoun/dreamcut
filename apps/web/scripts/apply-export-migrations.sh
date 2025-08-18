#!/bin/bash

# Apply export system migrations to Supabase
# This script requires the Supabase CLI to be installed and configured

echo "Applying export system migrations to Supabase..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Get the project ID from the environment or prompt the user
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "Enter your Supabase project ID:"
    read SUPABASE_PROJECT_ID
fi

# Apply the migration
echo "Applying export_system_setup.sql migration..."
supabase db push -p $SUPABASE_PROJECT_ID --db-url "postgresql://postgres:postgres@localhost:54322/postgres" --debug

echo "Verifying export_jobs table..."
supabase db query -p $SUPABASE_PROJECT_ID "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'export_jobs');"

echo "Verifying storage buckets..."
supabase db query -p $SUPABASE_PROJECT_ID "SELECT * FROM storage.buckets WHERE id IN ('export_data', 'exports');"

echo "Migration completed!"
