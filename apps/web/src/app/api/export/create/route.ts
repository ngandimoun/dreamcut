import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

import { Database } from "@/lib/supabase/types";
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
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
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
    
    // Store the timeline data in Supabase Storage for the worker to process
    const timelineDataString = JSON.stringify(body.timeline_data);
    const { error: storageError } = await supabase
      .storage
      .from('export_data')
      .upload(`${userId}/${jobId}/timeline.json`, timelineDataString, {
        contentType: 'application/json',
        upsert: true
      });
      
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
