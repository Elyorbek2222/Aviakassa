import { NextRequest, NextResponse } from 'next/server';
import { getRefundlar, addRefund } from '@/lib/avia-storage';
import { appendToSheet } from '@/lib/gsheet';
import { requireRole, requireAuth } from '@/lib/api-auth';
import { todayStr } from '@/lib/utils';
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
    // Bilet puli qaytarish — admin yoki Finansist (kassir).
    const auth = await requireRole(['admin', 'kassir']);
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
      izoh: body.izoh || '',
    };

    const all = await addRefund(item);

    logChange(auth, 'create', 'refund', item.id, `Refund: ${item.mijozIsmi || item.biletRaqam || '—'} — ${item.summa.toLocaleString('ru-RU')} so'm`, { after: item }).catch(() => {});

    // Google Sheets'ga nusxa (Tolovlar sheetga REFUND deb yoziladi)
    appendToSheet('Tolovlar', [today, item.mijozIsmi, -item.summa, 'REFUND', item.biletRaqam, 'UZS', '', '', item.izoh || 'Refund']).catch(() => {});

    return NextResponse.json({ refund: item, total: all.length });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
