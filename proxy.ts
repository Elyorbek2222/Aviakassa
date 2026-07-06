import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromToken, SESSION_COOKIE_NAME, ROLE_PAGES, ROLE_HOME, type UserRole } from './lib/auth';

// Next.js 16'dan boshlab "middleware" -> "proxy" deb nomlanadi (vazifa o'zgarmagan).
// Bu faqat sahifalar uchun optimistik yo'naltirish — har bir API route o'z
// avtorizatsiyasini ichida tekshiradi (lib/api-auth.ts).

const PUBLIC_PATHS = ['/login'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Barcha API route'lar o'tib ketadi — ular o'z auth'ini ichida tekshiradi.
  // (Sahifa emas, JSON qaytaradigan endpoint'larni /login'ga yo'naltirib bo'lmaydi.)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Ochiq yo'llar (login)
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Sessiya cookie'sini tekshirish
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sessiyani dekodlash
  const user = getSessionFromToken(sessionCookie.value);
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // Rolga asoslangan kirish nazorati
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
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|manifest|sw.js|robots.txt|sitemap.xml).*)',
  ],
};
