import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware runs at the edge, so we use relative imports
// and check for auth without importing the full auth config

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin');
  const isSensitiveApi = pathname.startsWith('/api/inventory')
    || pathname.startsWith('/api/upload')
    || pathname.startsWith('/api/admin');

  if (!isAdminRoute && !isSensitiveApi) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const authToken = req.cookies.get('authjs.session-token')?.value 
    || req.cookies.get('__Secure-authjs.session-token')?.value;

  if (!authToken) {
    const loginUrl = new URL('/ingresar', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/inventory/:path*', '/api/upload/:path*'],
};
