import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { TProject } from "@/types/project";

interface SupabaseProject {
  id: string;
  user_id: string;
  name: string;
  thumbnail: string | null;
  background_color: string;
  background_type: string;
  blur_intensity: number;
  bookmarks: number[];
  fps: number;
  canvas_size: { width: number; height: number };
  canvas_mode: string;
  created_at: string;
  updated_at: string;
}

class SupabaseStorageService {
  private supabase = createClientComponentClient();

  // Convert TProject to Supabase format
  private toSupabaseProject(project: TProject, userId: string): Omit<SupabaseProject, 'created_at' | 'updated_at'> {
    return {
      id: project.id,
      user_id: userId,
      name: project.name,
      thumbnail: project.thumbnail,
      background_color: project.backgroundColor,
      background_type: project.backgroundType,
      blur_intensity: project.blurIntensity,
      bookmarks: project.bookmarks,
      fps: project.fps,
      canvas_size: project.canvasSize,
      canvas_mode: project.canvasMode,
    };
  }

  // Convert Supabase project to TProject format
  private fromSupabaseProject(supabaseProject: SupabaseProject): TProject {
    return {
      id: supabaseProject.id,
      name: supabaseProject.name,
      thumbnail: supabaseProject.thumbnail,
      backgroundColor: supabaseProject.background_color,
      backgroundType: supabaseProject.background_type as "color" | "blur",
      blurIntensity: supabaseProject.blur_intensity,
      bookmarks: supabaseProject.bookmarks,
      fps: supabaseProject.fps,
      canvasSize: supabaseProject.canvas_size,
      canvasMode: supabaseProject.canvas_mode as "preset" | "custom",
      createdAt: new Date(supabaseProject.created_at),
      updatedAt: new Date(supabaseProject.updated_at),
    };
  }

  async saveProject(project: TProject): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const supabaseProject = this.toSupabaseProject(project, user.id);

      const { error } = await this.supabase
        .from('projects')
        .upsert(supabaseProject, { onConflict: 'id' });

      if (error) {
        console.error("Failed to save project to Supabase:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error saving project to Supabase:", error);
      throw error;
    }
  }

  async loadProject(id: string): Promise<TProject | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return null;
      }

      const { data: project, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !project) {
        return null;
      }

      return this.fromSupabaseProject(project);
    } catch (error) {
      console.error("Error loading project from Supabase:", error);
      return null;
    }
  }

  async loadAllProjects(): Promise<TProject[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error || !projects) {
        return [];
      }

      return projects.map(project => this.fromSupabaseProject(project));
    } catch (error) {
      console.error("Error loading projects from Supabase:", error);
      return [];
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error("Failed to delete project from Supabase:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error deleting project from Supabase:", error);
      throw error;
    }
  }

  async createProject(name: string): Promise<TProject> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const newProject: Omit<SupabaseProject, 'created_at' | 'updated_at'> = {
        id: crypto.randomUUID(),
        user_id: user.id,
        name,
        thumbnail: null,
        background_color: '#000000',
        background_type: 'color',
        blur_intensity: 8,
        bookmarks: [],
        fps: 30,
        canvas_size: { width: 1920, height: 1080 },
        canvas_mode: 'preset',
      };

      const { data: project, error } = await this.supabase
        .from('projects')
        .insert(newProject)
        .select()
        .single();

      if (error || !project) {
        throw error || new Error("Failed to create project");
      }

      return this.fromSupabaseProject(project);
    } catch (error) {
      console.error("Error creating project in Supabase:", error);
      throw error;
    }
  }
}

export const supabaseStorageService = new SupabaseStorageService();
