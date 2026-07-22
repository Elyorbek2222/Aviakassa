import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  authenticate,
  createSessionToken,
  getSessionFromToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

// Brute-force cheklovi: bir IP dan muvaffaqiyatsiz login urinishlari sonini
// cheklaydi. Video'dagi #1 hujum — parolni ketma-ket urib topish (brute force).
// ponytail: in-memory — serverless'da har instance alohida hisoblaydi va sovuq
// start'da nollanadi. Bir instance uchun ham hujumni sezilarli sekinlashtiradi.
// Ko'p instance / jiddiy yuk bo'lsa Upstash Redis (@upstash/ratelimit)'ga o'tkaziladi.
const loginAttempts = new Map<string, { count: number; first: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000; // 10 daqiqa

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

// Muvaffaqiyatsiz urinishni qayd etadi va limit oshgan bo'lsa true qaytaradi.
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, first: now });
    return false;
  }
  rec.count++;
  return rec.count > MAX_ATTEMPTS;
}

// POST: login
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Juda ko\'p urinish. 10 daqiqadan so\'ng qayta urinib ko\'ring.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username va password kiritilishi shart' },
        { status: 400 }
      );
    }

    const user = authenticate(username, password);
    if (!user) {
      return NextResponse.json(
        { error: "Noto'g'ri login yoki parol" },
        { status: 401 }
      );
    }

    // Muvaffaqiyatli login — shu IP hisoblagichini tozalaymiz.
    loginAttempts.delete(ip);

    const token = createSessionToken(user);

    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// GET: session check
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Sessiya topilmadi' }, { status: 401 });
    }

    const user = getSessionFromToken(sessionCookie.value);
    if (!user) {
      return NextResponse.json({ error: 'Sessiya yaroqsiz' }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// DELETE: logout
export async function DELETE() {
  const response = NextResponse.json({ message: 'Tizimdan chiqildi' });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
