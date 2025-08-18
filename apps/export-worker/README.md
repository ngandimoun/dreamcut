# OpenCut Export Worker

This worker service processes video export jobs for OpenCut using FFmpeg. It runs as a standalone service on Railway and communicates with Supabase for job management and file storage.

## Features

- Polls Supabase for queued export jobs
- Downloads media files from Supabase Storage
- Processes timeline data into FFmpeg commands
- Renders videos using FFmpeg
- Uploads completed exports to Supabase Storage
- Updates job status and progress in real-time

## Setup

### Prerequisites

- Node.js 18+
- FFmpeg installed on the system
- Supabase project with the export_jobs table and storage buckets set up

### Environment Variables

Copy `.env.example` to `.env` and configure:

```
# Supabase connection details
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2MTY3NjU1NjIsImV4cCI6MTkzMjM0MTU2Mn0.YOUR_SERVICE_KEY_HERE

# Worker settings
POLL_INTERVAL=10000  # 10 seconds
MAX_CONCURRENT_JOBS=2
TEMP_DIR=/tmp/opencut-exports

# FFmpeg settings
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe

# Railway specific (automatically provided by Railway)
PORT=8080
RAILWAY_STATIC_URL=https://your-worker-url.up.railway.app
```

### Getting Supabase Service Key

1. Go to your Supabase project dashboard
2. Navigate to Project Settings > API
3. Find the "service_role key" (with secret) under Project API keys
4. Copy this key as your SUPABASE_SERVICE_KEY

### Installation

```bash
npm install
```

### Running Locally

```bash
npm start
```

## Deployment on Railway

1. Create a new Railway project:
   ```bash
   railway login
   railway init
   ```

2. Link your GitHub repository:
   ```bash
   railway link
   ```

3. Add environment variables:
   ```bash
   railway variables set SUPABASE_URL=https://your-project-id.supabase.co
   railway variables set SUPABASE_SERVICE_KEY=your-service-key
   ```

4. Deploy the service:
   ```bash
   railway up
   ```

5. Alternatively, set up automatic deployments from GitHub in the Railway dashboard.

## Communication between Supabase and Railway

The worker communicates with Supabase in the following ways:

1. **Database Access**: The worker uses the Supabase service key to query the `export_jobs` table for new jobs and update job status.

2. **Storage Access**: The worker downloads timeline data and media files from Supabase Storage buckets and uploads the final exported videos.

### Authentication Flow

1. The worker initializes the Supabase client with the service key:
   ```javascript
   const supabase = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_SERVICE_KEY
   );
   ```

2. This service key has full access to the database and storage, allowing the worker to:
   - Read and write to the `export_jobs` table
   - Download files from the `export_data` bucket
   - Upload files to the `exports` bucket

3. The service key bypasses RLS policies, so be careful with it.

### Webhook Integration (Optional)

For more efficient job processing, you can set up a webhook from Supabase to Railway:

1. Create a simple endpoint in the worker:
   ```javascript
   app.post('/webhook/new-job', (req, res) => {
     // Trigger job processing
     pollForJobs();
     res.status(200).send('OK');
   });
   ```

2. Set up a Supabase database webhook to call this endpoint when a new job is created.