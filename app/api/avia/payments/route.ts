import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionFromToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getPayments, addSinglePayment, clearPayments } from '@/lib/avia-storage';
import { appendToSheet } from '@/lib/gsheet';
import type { AviaPayment } from '@/types/avia';

// GET: return payments with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    let payments = getPayments();

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
    const today = new Date().toISOString().split('T')[0];

    const payment: AviaPayment = {
      id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: today,
      biletRaqam: body.biletRaqam,
      mijozIsmi: body.mijozIsmi,
      valyuta: body.valyuta || 'uzs',
      summAsl: body.valyuta === 'usd' ? Number(body.summAsl) : undefined,
      kurs: body.valyuta === 'usd' ? Number(body.kurs) : undefined,
      summa: Number(body.summa) || 0,
      tolovTuri: body.tolovTuri || 'naqd',
      izoh: body.izoh || '',
    };

    const payments = addSinglePayment(payment);

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

// DELETE: clear all payments (admin only)
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? getSessionFromToken(token) : null;
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }
    clearPayments();
    return NextResponse.json({ message: 'Barcha to\'lovlar tozalandi' });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
