import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
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
    
    // Get the project from the database
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error("Failed to fetch project:", error);
      return NextResponse.json(
        { error: "Failed to fetch project", message: error.message },
        { status: 500 }
      );
    }
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ project });
    
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
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
    
    // Prepare update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.thumbnail !== undefined) updateData.thumbnail = body.thumbnail;
    if (body.backgroundColor !== undefined) updateData.background_color = body.backgroundColor;
    if (body.backgroundType !== undefined) updateData.background_type = body.backgroundType;
    if (body.blurIntensity !== undefined) updateData.blur_intensity = body.blurIntensity;
    if (body.bookmarks !== undefined) updateData.bookmarks = body.bookmarks;
    if (body.fps !== undefined) updateData.fps = body.fps;
    if (body.canvasSize !== undefined) updateData.canvas_size = body.canvasSize;
    if (body.canvasMode !== undefined) updateData.canvas_mode = body.canvasMode;
    
    // Update the project in the database
    const { data: project, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single();
      
    if (error) {
      console.error("Failed to update project:", error);
      return NextResponse.json(
        { error: "Failed to update project", message: error.message },
        { status: 500 }
      );
    }
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ project });
    
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
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
    
    // Delete the project from the database
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);
      
    if (error) {
      console.error("Failed to delete project:", error);
      return NextResponse.json(
        { error: "Failed to delete project", message: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ message: "Project deleted successfully" });
    
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Internal server error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
