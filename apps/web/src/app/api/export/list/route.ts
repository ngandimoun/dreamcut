import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server-utils";

import { ExportJob } from "@/lib/export/types";

export async function GET(request: NextRequest) {
  try {
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
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("project_id");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    
    // Build the query
    let query = supabase
      .from('export_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);
      
    // Filter by project if provided
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    // Execute the query
    const { data: jobs, error } = await query;
      
    if (error) {
      console.error("Failed to fetch export jobs:", error);
      return NextResponse.json(
        { error: "Failed to fetch export jobs", message: error.message },
        { status: 500 }
      );
    }
    
    // Return the jobs
    return NextResponse.json({ jobs });
    
  } catch (error) {
    console.error("Error fetching export jobs:", error);
    return NextResponse.json(
      { error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
