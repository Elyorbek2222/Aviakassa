import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionFromToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getObmenlar, addObmen, updateObmen, getPayments } from '@/lib/avia-storage';
import { requireAuth } from '@/lib/api-auth';
import { ticketEditRemainingMs, todayStr } from '@/lib/utils';
import { logChange } from '@/lib/audit';
import type { Obmen } from '@/types/avia';

// GET: barcha obmen yozuvlari
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    return NextResponse.json({ obmenlar: await getObmenlar() });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST: yangi obmen (USD -> UZS). Faqat kassir yoki admin.
export async function POST(request: NextRequest) {
  try {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    const user = token ? getSessionFromToken(token) : null;
    if (!user || (user.role !== 'kassir' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }

    const body = await request.json();
    const usdSumma = Number(body.usdSumma) || 0;
    const kurs = Number(body.kurs) || 0;
    if (usdSumma <= 0 || kurs <= 0) {
      return NextResponse.json({ error: 'USD summa va kurs kerak' }, { status: 400 });
    }
    // UZS ni doim server hisoblaydi (usd × kurs) — clientga ishonmaymiz, drift bo'lmasin.
    const uzsSumma = Math.round(usdSumma * kurs);

    // Yetarli USD tekshiruvi: kassada yig'ilgan USD dan ortiq obmen qilib bo'lmaydi.
    // Mavjud USD = USD to'lovlar (summAsl) − oldingi obmenlar (usdSumma).
    if (!body.allowNegative) {
      const [payments, obmenlar] = await Promise.all([getPayments(), getObmenlar()]);
      const usdKirim = payments.reduce((s, p) => s + (p.valyuta === 'usd' ? (p.summAsl || 0) : 0), 0);
      const usdChiqim = obmenlar.reduce((s, o) => s + o.usdSumma, 0);
      const mavjud = usdKirim - usdChiqim;
      if (usdSumma > mavjud) {
        return NextResponse.json(
          { error: `Kassada yetarli USD yo'q. Mavjud: $${mavjud.toLocaleString('en-US')}`, insufficient: true, mavjud },
          { status: 409 },
        );
      }
    }

    const item: Obmen = {
      id: `OBM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: todayStr(),
      usdSumma, kurs, uzsSumma,
      izoh: body.izoh || undefined,
    };
    const all = await addObmen(item);
    logChange(user, 'create', 'obmen', item.id, `Obmen: $${item.usdSumma} × ${item.kurs} = ${item.uzsSumma.toLocaleString('ru-RU')} so'm`, { after: item }).catch(() => {});
    return NextResponse.json({ obmen: item, total: all.length });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// PATCH: obmenni tahrirlash — admin har doim, kassir 48 soat ichida.
export async function PATCH(request: NextRequest) {
  try {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    const user = token ? getSessionFromToken(token) : null;
    if (!user) return NextResponse.json({ error: 'Avtorizatsiya yo\'q' }, { status: 401 });

    const body = await request.json();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const all = await getObmenlar();
    const existing = all.find((o) => o.id === id);
    if (!existing) return NextResponse.json({ error: 'Obmen topilmadi' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    const isFinance = user.role === 'kassir';
    if (!isAdmin && !isFinance) return NextResponse.json({ error: 'Tahrirlash huquqi yo\'q' }, { status: 403 });
    if (!isAdmin && ticketEditRemainingMs(existing) <= 0) {
      return NextResponse.json({ error: '48 soatlik tahrirlash muddati tugagan' }, { status: 403 });
    }

    const usdSumma = body.usdSumma !== undefined ? Number(body.usdSumma) : existing.usdSumma;
    const kurs = body.kurs !== undefined ? Number(body.kurs) : existing.kurs;
    const updated: Obmen = {
      ...existing, // id, sana o'zgarmaydi
      usdSumma, kurs,
      uzsSumma: Math.round(usdSumma * kurs), // doim usd × kurs
      izoh: body.izoh ?? existing.izoh,
    };
    await updateObmen(updated);
    logChange(user, 'update', 'obmen', updated.id, `Obmen tahrirlandi: $${updated.usdSumma} × ${updated.kurs}`, { before: existing, after: updated }).catch(() => {});
    return NextResponse.json({ obmen: updated });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
