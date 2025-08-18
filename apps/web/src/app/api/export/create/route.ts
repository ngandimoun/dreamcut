import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server-utils";
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from "uuid";

import { CreateExportJobRequest, ExportJob, ExportJobResponse } from "@/lib/export/types";
import { calculateTimelineDuration } from "@/lib/timeline";
import { rateLimiter } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimit = await rateLimiter(request);
  if (rateLimit.status !== 200) {
    return rateLimit.response;
  }

  try {
    // Get the request body
    const body = await request.json() as CreateExportJobRequest;
    
    if (!body.project_id || !body.timeline_data) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Calculate total duration from timeline data
    const duration = calculateTimelineDuration(body.timeline_data.tracks);
    
    // Create a new export job
    const jobId = uuidv4();
    const { project } = body.timeline_data;
    
    const newJob: Omit<ExportJob, 'created_at'> = {
      id: jobId,
      user_id: userId,
      project_id: body.project_id,
      status: "queued",
      width: project.canvasSize.width,
      height: project.canvasSize.height,
      fps: project.fps || 30,
      duration,
      progress: 0
    };
    
    // Insert the job into the database
    const { error: dbError } = await supabase
      .from('export_jobs')
      .insert(newJob);
      
    if (dbError) {
      console.error("Failed to create export job:", dbError);
      return NextResponse.json(
        { error: "Failed to create export job", message: dbError.message },
        { status: 500 }
      );
    }
    
    // Create a Supabase client with service role key for storage operations
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Store the timeline data in Supabase Storage for the worker to process
    console.log('Preparing to upload timeline data:', {
      userId,
      jobId,
      bucket: 'export_data',
      dataSize: JSON.stringify(body.timeline_data).length
    });

    const timelineDataString = JSON.stringify(body.timeline_data);
    
    // First check if we can list the bucket
    const { data: buckets, error: bucketError } = await serviceClient
      .storage
      .listBuckets();
    
    console.log('Available buckets:', {
      buckets: buckets?.map(b => b.id),
      error: bucketError?.message
    });

    // Try to list the user's directory
    const { data: files, error: listError } = await serviceClient
      .storage
      .from('export_data')
      .list(userId);

    console.log('User directory contents:', {
      files: files?.map(f => f.name),
      error: listError?.message
    });

    // Upload the timeline data
    console.log('Attempting to upload timeline data to:', `${userId}/${jobId}/timeline.json`);
    const { data: uploadData, error: storageError } = await serviceClient
      .storage
      .from('export_data')
      .upload(`${userId}/${jobId}/timeline.json`, timelineDataString, {
        contentType: 'application/json',
        upsert: true
      });
    
    console.log('Upload result:', {
      data: uploadData,
      error: storageError,
      path: `${userId}/${jobId}/timeline.json`
    });

    if (storageError) {
      console.error('Failed to upload timeline data:', {
        error: storageError,
        userId,
        jobId,
        path: `${userId}/${jobId}/timeline.json`
      });
    } else {
      console.log('Successfully uploaded timeline data:', {
        userId,
        jobId,
        path: `${userId}/${jobId}/timeline.json`
      });
    }
      
    if (storageError) {
      console.error("Failed to store timeline data:", storageError);
      
      // Update job status to failed
      await supabase
        .from('export_jobs')
        .update({ status: 'failed', error_message: 'Failed to store timeline data' })
        .eq('id', jobId);
        
      return NextResponse.json(
        { error: "Failed to store timeline data", message: storageError.message },
        { status: 500 }
      );
    }
    
    // Return the job information
    const response: ExportJobResponse = {
      job: {
        ...newJob,
        created_at: new Date().toISOString()
      },
      message: "Export job created successfully"
    };
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    console.error("Error creating export job:", error);
    return NextResponse.json(
      { error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
