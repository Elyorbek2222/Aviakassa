// API route'lar uchun markazlashtirilgan avtorizatsiya yordamchilari.
//
// Proxy (middleware) barcha /api/* so'rovlarini o'tkazib yuboradi — himoya
// har bir route ichida bo'lishi shart. Bu yordamchilar shu tekshiruvni bitta
// joyga jamlaydi, shunda ruxsat qoidalari auditga oson bo'ladi.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSessionFromToken, SESSION_COOKIE_NAME, type AuthUser, type UserRole } from './auth';

// Joriy sessiya foydalanuvchisi (yo'q bo'lsa null).
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? getSessionFromToken(token) : null;
}

// Berilgan rollardan birini talab qiladi.
// Muvaffaqiyatda AuthUser, aks holda darhol qaytariladigan NextResponse (401/403).
// Ishlatish:
//   const auth = await requireRole(['admin']);
//   if (auth instanceof NextResponse) return auth;
//   // shu yerdan keyin `auth` — AuthUser
export async function requireRole(roles: UserRole[]): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Avtorizatsiya talab qilinadi' }, { status: 401 });
  }
  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
  return user;
}
