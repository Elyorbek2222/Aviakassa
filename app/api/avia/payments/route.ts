import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionFromToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getPayments, addSinglePayment, clearPayments, updatePayment, getTickets } from '@/lib/avia-storage';
import { appendToSheet } from '@/lib/gsheet';
import { ticketEditRemainingMs, todayStr } from '@/lib/utils';
import { validatePayment } from '@/lib/validate';
import type { AviaPayment } from '@/types/avia';

// GET: return payments with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    let payments = await getPayments();

    if (from) {
      payments = payments.filter((p) => p.sana >= from);
    }
    if (to) {
      payments = payments.filter((p) => p.sana <= to);
    }
    if (type) {
      payments = payments.filter((p) => p.tolovTuri === type);
    }
    if (search) {
      const q = search.toLowerCase();
      payments = payments.filter(
        (p) =>
          p.mijozIsmi.toLowerCase().includes(q) ||
          p.biletRaqam.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ payments });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST: add single payment from form
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? getSessionFromToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Avtorizatsiya talab qilinadi' }, { status: 401 });
    }

    const body = await request.json();
    const today = todayStr();

    // Validatsiya — summa/kurs xato bo'lsa jimgina 0 ga aylanmasin
    const valid = validatePayment(body);
    if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
    const { valyuta, summa, summAsl, kurs, tolovTuri } = valid.value;

    const biletRaqam = body.biletRaqam ? String(body.biletRaqam).trim() : '';

    // Obmen: USD + biletsiz bo'lsa va mijoz nomi bo'sh bo'lsa — "Obmen" deb belgilanadi
    const mijozIsmi = body.mijozIsmi || (valyuta === 'usd' && !biletRaqam ? 'Obmen' : '');

    // Ortiqcha to'lov himoyasi: bilet raqami bo'lsa, to'langan + yangi summa
    // biletning sotish narxidan oshmasin (allowOverpay bilan majburan o'tkazsa bo'ladi).
    if (biletRaqam && !body.allowOverpay) {
      const tickets = await getTickets();
      const ticket = tickets.find((t) => t.biletRaqam === biletRaqam);
      if (ticket) {
        const existingPayments = await getPayments();
        const tolangan = existingPayments
          .filter((p) => p.biletRaqam === biletRaqam)
          .reduce((s, p) => s + p.summa, 0);
        const qolgan = ticket.sotishNarxi - tolangan;
        if (summa > qolgan) {
          return NextResponse.json(
            {
              error: `To'lov qolgan qarzdan oshib ketdi. Qolgan qarz: ${qolgan.toLocaleString('ru-RU')} so'm`,
              overpay: true,
              qolgan,
            },
            { status: 409 }
          );
        }
      }
    }

    const payment: AviaPayment = {
      id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: today,
      biletRaqam,
      mijozIsmi,
      valyuta,
      summAsl: valyuta === 'usd' ? summAsl : undefined,
      kurs: valyuta === 'usd' ? kurs : undefined,
      summa,
      tolovTuri,
      izoh: body.izoh || '',
    };

    const payments = await addSinglePayment(payment);

    // Google Sheets'ga yozish
    const row = [
      today,
      payment.mijozIsmi,
      payment.valyuta === 'usd' ? '' : payment.summa,
      payment.tolovTuri,
      payment.biletRaqam,
      payment.valyuta.toUpperCase(),
      payment.summAsl || '',
      payment.kurs || '',
      payment.izoh || '',
    ];
    appendToSheet('Tolovlar', row).catch(() => {});

    return NextResponse.json({ payment, total: payments.length });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// PATCH: edit an existing payment (prixod).
// Ruxsat: admin — istalgan vaqtda; kassir (Finansist) — 48 soat ichida. Boshqalar — taqiqlangan.
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? getSessionFromToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Avtorizatsiya yo\'q' }, { status: 401 });
    }

    const body = await request.json();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const payments = await getPayments();
    const existing = payments.find((p) => p.id === id);
    if (!existing) return NextResponse.json({ error: 'To\'lov topilmadi' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    const isFinance = user.role === 'kassir';
    if (!isAdmin && !isFinance) {
      return NextResponse.json({ error: 'Tahrirlash huquqi yo\'q' }, { status: 403 });
    }
    if (!isAdmin && ticketEditRemainingMs(existing) <= 0) {
      return NextResponse.json({ error: '48 soatlik tahrirlash muddati tugagan' }, { status: 403 });
    }

    const valyuta = body.valyuta ?? existing.valyuta;
    const updated: AviaPayment = {
      ...existing, // id, sana o'zgarmaydi
      biletRaqam: body.biletRaqam ?? existing.biletRaqam,
      mijozIsmi: body.mijozIsmi ?? existing.mijozIsmi,
      valyuta,
      summAsl: valyuta === 'usd' ? (body.summAsl !== undefined ? Number(body.summAsl) : existing.summAsl) : undefined,
      kurs: valyuta === 'usd' ? (body.kurs !== undefined ? Number(body.kurs) : existing.kurs) : undefined,
      summa: body.summa !== undefined ? Number(body.summa) : existing.summa,
      tolovTuri: body.tolovTuri ?? existing.tolovTuri,
      izoh: body.izoh ?? existing.izoh,
    };

    const valid = validatePayment(updated as unknown as Record<string, unknown>);
    if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });

    await updatePayment(updated);
    return NextResponse.json({ payment: updated });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// DELETE: clear all payments (admin only)
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? getSessionFromToken(token) : null;
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }
    await clearPayments();
    return NextResponse.json({ message: 'Barcha to\'lovlar tozalandi' });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
