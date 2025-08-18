import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // For now, we'll handle authentication in the components
  // This avoids the Supabase middleware compatibility issue with Next.js 15
  
  // You can add basic route protection here later when the compatibility issue is resolved
  // or when you upgrade to a compatible version of Supabase auth helpers
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/projects/:path*', '/login', '/signup'],
};
