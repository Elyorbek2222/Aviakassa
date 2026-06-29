import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromToken, SESSION_COOKIE_NAME, ROLE_PAGES, ROLE_HOME, type UserRole } from './lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all API routes through (they handle own auth)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode session
  const user = getSessionFromToken(sessionCookie.value);
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // Check role-based access
  const role = user.role as UserRole;
  const allowedPages = ROLE_PAGES[role] || [];
  const hasAccess = allowedPages.some((page) => {
    if (page === '/') return pathname === '/';
    return pathname === page || pathname.startsWith(page + '/');
  });

  if (!hasAccess) {
    const homeUrl = new URL(ROLE_HOME[role] || '/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Metadata-rasm yo'llari (og:image, favicon) auth'dan ozod — aks holda
  // ijtimoiy tarmoq crawlerlari rasm o'rniga login sahifasini oladi.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|manifest|robots.txt|sitemap.xml).*)',
  ],
};
