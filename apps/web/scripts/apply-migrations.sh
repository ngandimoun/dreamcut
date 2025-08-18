#!/bin/bash

# Script to apply migrations to Supabase
# This script will install the required dependencies and run the apply-migrations.js script

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js and try again"
    exit 1
fi

# Change to the script directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "../node_modules/@supabase/supabase-js" ]; then
    echo "Installing dependencies..."
    npm install --no-save @supabase/supabase-js dotenv
fi

# Run the migration script
echo "Running migrations..."
node apply-migrations.js

# Exit with the same status as the migration script
exit $?
