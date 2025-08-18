# Setting Up Export System with Supabase MCP

This guide provides step-by-step instructions for setting up the Dreamcut export system using Supabase MCP tools.

## Prerequisites

- Supabase project
- Railway account
- Dreamcut codebase

## Step 1: Apply Migrations Using Supabase MCP

### Option 1: Using Supabase Dashboard

1. Navigate to your Supabase project dashboard
2. Go to the SQL Editor
3. Copy the contents of `apps/web/migrations/export_system_setup.sql`
4. Paste into the SQL Editor and run the query

### Option 2: Using Supabase CLI

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Run the migration script:
   ```bash
   cd apps/web
   chmod +x scripts/apply-export-migrations.sh
   ./scripts/apply-export-migrations.sh
   ```

### Option 3: Using Supabase JavaScript Client

1. Set up environment variables:
   ```bash
   export SUPABASE_URL=https://your-project-id.supabase.co
   export SUPABASE_SERVICE_KEY=your-service-role-key
   ```

2. Run the JavaScript migration script:
   ```bash
   cd apps/web
   node scripts/apply-export-migrations.js
   ```

## Step 2: Verify Supabase Setup

### Check Database Tables

1. Go to the Supabase dashboard
2. Navigate to the Table Editor
3. Verify that the `export_jobs` table exists with the correct schema

### Check Storage Buckets

1. Go to the Storage section in the Supabase dashboard
2. Verify that the `export_data` and `exports` buckets exist
3. Check that the bucket policies are correctly applied

## Step 3: Configure Railway Worker

### Set Up Environment Variables

1. In your Railway project, add the following environment variables:

   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   POLL_INTERVAL=10000
   MAX_CONCURRENT_JOBS=2
   TEMP_DIR=/tmp/dreamcut-exports
   ```

2. Get your Supabase URL and service key:
   - URL: Found in Project Settings > API > Project URL
   - Service Key: Found in Project Settings > API > Project API Keys > `service_role` key

### Deploy the Worker

1. Push your code to your Git repository
2. Connect your Railway project to your Git repository
3. Configure the deployment settings to use the Dockerfile

### Test the Connection

1. Once deployed, run the connection check:
   ```bash
   cd apps/export-worker
   npm run check-connection
   ```

2. This will verify:
   - Supabase connection is working
   - Export_jobs table exists
   - Storage buckets exist and are accessible
   - FFmpeg is installed and working

## Step 4: Set Up Webhook (Optional)

For more efficient job processing, you can set up a webhook from Supabase to Railway:

1. Get your Railway worker URL:
   ```bash
   railway domain
   ```

2. Update the webhook URL in the migration script:
   ```sql
   -- In export_system_setup.sql
   PERFORM net.http_post(
     'https://your-railway-worker-url.up.railway.app/webhook/new-job',
     ...
   );
   ```

3. Re-run the migration to update the webhook URL

## Step 5: Test the Export System

1. Create a test project in the Dreamcut UI
2. Add some media to the timeline
3. Click the Export button
4. Monitor the job status in the UI
5. Check the Railway logs to see the worker processing the job
6. Verify that the exported video is uploaded to the `exports` bucket

## Troubleshooting

### Common Issues

1. **"Cannot connect to Supabase" error**:
   - Verify that the SUPABASE_URL and SUPABASE_SERVICE_KEY are correct
   - Check that your IP is allowed in the Supabase dashboard

2. **"Table export_jobs does not exist" error**:
   - Run the migration script again
   - Check for any errors in the SQL output

3. **"Storage bucket not found" error**:
   - Verify that the buckets were created correctly
   - Check the bucket policies

4. **"FFmpeg not found" error**:
   - Verify that FFmpeg is installed in your Railway container
   - Check the Dockerfile to ensure it includes FFmpeg installation

### Checking Railway Logs

```bash
railway logs
```

### Testing Supabase Connection

```bash
curl -X GET https://your-railway-worker-url.up.railway.app/health
```

## Additional Resources

- [Supabase Documentation](https://supabase.io/docs)
- [Railway Documentation](https://docs.railway.app)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
