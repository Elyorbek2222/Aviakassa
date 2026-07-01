import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionFromToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getRasxodlar, addRasxod, updateRasxod } from '@/lib/avia-storage';
import { ticketEditRemainingMs, todayStr } from '@/lib/utils';
import { requireRole } from '@/lib/api-auth';
import { validateAmount } from '@/lib/validate';
import { logChange } from '@/lib/audit';
import type { Rasxod } from '@/types/avia';

export async function GET() {
  try {
    return NextResponse.json({ rasxodlar: await getRasxodlar() });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Chiqim qo'shish — admin yoki Finansist (kassir).
    const auth = await requireRole(['admin', 'kassir']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const today = todayStr();

    const summaRes = validateAmount(body.summa, 'Summa');
    if (!summaRes.ok) return NextResponse.json({ error: summaRes.error }, { status: 400 });

    const item: Rasxod = {
      id: `RSX-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: today,
      summa: summaRes.value,
      sabab: body.sabab || '',
    };

    const all = await addRasxod(item);
    logChange(auth, 'create', 'rasxod', item.id, `Rasxod: ${item.summa.toLocaleString('ru-RU')} so'm — ${item.sabab || '—'}`, { after: item }).catch(() => {});
    return NextResponse.json({ rasxod: item, total: all.length });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// PATCH: edit an existing rasxod.
// Ruxsat: admin — istalgan vaqtda; kassir (Finansist) — 48 soat ichida.
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? getSessionFromToken(token) : null;
    if (!user) return NextResponse.json({ error: 'Avtorizatsiya yo\'q' }, { status: 401 });

    const body = await request.json();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const all = await getRasxodlar();
    const existing = all.find((r) => r.id === id);
    if (!existing) return NextResponse.json({ error: 'Rasxod topilmadi' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    const isFinance = user.role === 'kassir';
    if (!isAdmin && !isFinance) {
      return NextResponse.json({ error: 'Tahrirlash huquqi yo\'q' }, { status: 403 });
    }
    if (!isAdmin && ticketEditRemainingMs(existing) <= 0) {
      return NextResponse.json({ error: '48 soatlik tahrirlash muddati tugagan' }, { status: 403 });
    }

    const nextSumma = body.summa !== undefined ? Number(body.summa) : existing.summa;
    const summaRes = validateAmount(nextSumma, 'Summa');
    if (!summaRes.ok) return NextResponse.json({ error: summaRes.error }, { status: 400 });

    const updated: Rasxod = {
      ...existing, // id, sana o'zgarmaydi
      summa: summaRes.value,
      sabab: body.sabab ?? existing.sabab,
    };

    await updateRasxod(updated);
    logChange(user, 'update', 'rasxod', updated.id, `Rasxod tahrirlandi: ${updated.summa.toLocaleString('ru-RU')} so'm`, { before: existing, after: updated }).catch(() => {});
    return NextResponse.json({ rasxod: updated });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
