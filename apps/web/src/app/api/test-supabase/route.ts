import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server-utils';
import { db } from '@opencut/db';
import { users } from '@opencut/db';

export async function GET() {
  try {
    // Test Supabase connection
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Test database connection
    const result = await db.select().from(users).limit(1);
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      auth: {
        user: user ? 'Authenticated' : 'Not authenticated',
        error: authError?.message || null
      },
      database: {
        connected: true,
        usersCount: result.length
      }
    });
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to connect to Supabase'
    }, { status: 500 });
  }
}
