import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server-utils";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
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
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    
    // Fetch projects from database
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error("Failed to fetch projects:", error);
      return NextResponse.json(
        { error: "Failed to fetch projects", message: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ projects: projects || [] });
    
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
    
    // Get the request body
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    // Create new project
    const projectId = uuidv4();
    const newProject = {
      id: projectId,
      user_id: userId,
      name: body.name,
      thumbnail: body.thumbnail || null,
      background_color: body.backgroundColor || '#000000',
      background_type: body.backgroundType || 'color',
      blur_intensity: body.blurIntensity || 8,
      bookmarks: body.bookmarks || [],
      fps: body.fps || 30,
      canvas_size: body.canvasSize || { width: 1920, height: 1080 },
      canvas_mode: body.canvasMode || 'preset'
    };
    
    // Insert the project into the database
    const { data: project, error } = await supabase
      .from('projects')
      .insert(newProject)
      .select()
      .single();
      
    if (error) {
      console.error("Failed to create project:", error);
      return NextResponse.json(
        { error: "Failed to create project", message: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ project }, { status: 201 });
    
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
