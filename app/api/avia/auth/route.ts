import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  authenticate,
  createSessionToken,
  getSessionFromToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

// POST: login
export async function POST(request: NextRequest) {
  try {
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
