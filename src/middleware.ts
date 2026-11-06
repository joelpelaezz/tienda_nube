import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// This middleware runs at the edge, so we use relative imports
// and check for auth without importing the full auth config

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin');
  if (!isAdminRoute) {
    return NextResponse.next();
  }

  // C4-TRACE: authenticate every admin page request before any route segment
  // renders; cookie presence alone does not establish identity or role.
  if (isAdminRoute) {
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
    let token = null;
    if (secret) {
      for (const cookieName of ['__Secure-authjs.session-token', 'authjs.session-token']) {
        // Only accept the session cookie, not getToken's Authorization header fallback.
        if (!req.cookies.getAll().some(({ name }) => name === cookieName || name.startsWith(`${cookieName}.`))) continue;
        token = await getToken({ req, secret, cookieName });
        if (token) break;
      }
    }

    if (!token?.id) {
      const loginUrl = new URL('/ingresar', req.nextUrl.origin);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (token.role !== 'admin') return NextResponse.redirect(new URL('/', req.nextUrl.origin));
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/inventory/:path*', '/api/upload/:path*'],
};
