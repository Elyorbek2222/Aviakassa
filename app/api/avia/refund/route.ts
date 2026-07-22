import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionFromToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getRefundlar, addRefund, updateRefund } from '@/lib/avia-storage';
import { requireRole, requireAuth } from '@/lib/api-auth';
import { ticketEditRemainingMs, todayStr } from '@/lib/utils';
import { validateAmount } from '@/lib/validate';
import { logChange } from '@/lib/audit';
import type { Refund } from '@/types/avia';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    return NextResponse.json({ refundlar: await getRefundlar() });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Bilet puli qaytarish — Aviakassir (begzod) kiritadi, admin ham qo'sha oladi.
    // Refund kassa/foyda hisobiga KIRMAYDI — faqat qayd.
    const auth = await requireRole(['admin', 'begzod']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const today = todayStr();

    const summaRes = validateAmount(body.summa, 'Summa');
    if (!summaRes.ok) return NextResponse.json({ error: summaRes.error }, { status: 400 });

    const item: Refund = {
      id: `RFD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: today,
      biletRaqam: body.biletRaqam || '',
      mijozIsmi: body.mijozIsmi || '',
      summa: summaRes.value,
      airline: body.airline || undefined,
      airlineName: body.airlineName || undefined,
      manba: body.manba || undefined,
      izoh: body.izoh || '',
    };

    const all = await addRefund(item);

    logChange(auth, 'create', 'refund', item.id, `Refund: ${item.mijozIsmi || item.biletRaqam || '—'} — ${item.summa.toLocaleString('ru-RU')} so'm`, { after: item }).catch(() => {});

    // Refund hech qaysi hisobga (kassa/foyda/to'lovlar) kirmaydi — faqat qayd bo'lib
    // turadi. Shu sabab Google Sheets "Tolovlar" varag'iga YOZILMAYDI (aks holda
    // to'lovlar yig'indisini kamaytirib hisob-kitobni chalkashtirardi).

    return NextResponse.json({ refund: item, total: all.length });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// PATCH: mavjud refundni tahrirlash.
// Ruxsat: admin — istalgan vaqtda; begzod (Aviakassir) — 48 soat ichida.
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? getSessionFromToken(token) : null;
    if (!user) return NextResponse.json({ error: 'Avtorizatsiya yo\'q' }, { status: 401 });

    const body = await request.json();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const all = await getRefundlar();
    const existing = all.find((r) => r.id === id);
    if (!existing) return NextResponse.json({ error: 'Refund topilmadi' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    const isBegzod = user.role === 'begzod';
    if (!isAdmin && !isBegzod) {
      return NextResponse.json({ error: 'Tahrirlash huquqi yo\'q' }, { status: 403 });
    }
    if (!isAdmin && ticketEditRemainingMs(existing) <= 0) {
      return NextResponse.json({ error: '48 soatlik tahrirlash muddati tugagan' }, { status: 403 });
    }

    const nextSumma = body.summa !== undefined ? Number(body.summa) : existing.summa;
    const summaRes = validateAmount(nextSumma, 'Summa');
    if (!summaRes.ok) return NextResponse.json({ error: summaRes.error }, { status: 400 });

    const updated: Refund = {
      ...existing, // id, sana o'zgarmaydi
      biletRaqam: body.biletRaqam ?? existing.biletRaqam,
      mijozIsmi: body.mijozIsmi ?? existing.mijozIsmi,
      summa: summaRes.value,
      airline: body.airline ?? existing.airline,
      airlineName: body.airlineName ?? existing.airlineName,
      manba: body.manba ?? existing.manba,
      izoh: body.izoh ?? existing.izoh,
    };

    await updateRefund(updated);
    logChange(user, 'update', 'refund', updated.id, `Refund tahrirlandi: ${updated.mijozIsmi || updated.biletRaqam || '—'} — ${updated.summa.toLocaleString('ru-RU')} so'm`, { before: existing, after: updated }).catch(() => {});
    return NextResponse.json({ refund: updated });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
