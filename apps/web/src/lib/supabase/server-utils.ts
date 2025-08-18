import { createServerComponentClient, createRouteHandlerClient as createSupabaseRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from './types';

export const createServerClient = async () => {
  const cookieStore = await cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
};

export const createRouteHandlerClient = async () => {
  try {
    const cookieStore = await cookies();
    return createSupabaseRouteHandlerClient<Database>({ 
      cookies: () => cookieStore,
      options: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  } catch (error) {
    console.error("Error creating route handler client:", error);
    // Fallback to create a client without cookies - will be unauthenticated
    return createSupabaseRouteHandlerClient<Database>({ 
      options: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
};
