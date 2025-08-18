import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import { Database } from "@/lib/supabase/types";
import { ExportJobStatusResponse } from "@/lib/export/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { job_id: string } }
) {
  try {
    const jobId = params.job_id;
    
    if (!jobId) {
      return NextResponse.json(
        { error: "Missing job ID" },
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
    
    // Get the job from the database
    const { data: job, error } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error("Failed to fetch export job:", error);
      return NextResponse.json(
        { error: "Failed to fetch export job", message: error.message },
        { status: 500 }
      );
    }
    
    if (!job) {
      return NextResponse.json(
        { error: "Export job not found" },
        { status: 404 }
      );
    }
    
    // Return the job status
    const response: ExportJobStatusResponse = {
      job
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error("Error fetching export job status:", error);
    return NextResponse.json(
      { error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
