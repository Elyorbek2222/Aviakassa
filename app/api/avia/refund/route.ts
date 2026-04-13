import { NextRequest, NextResponse } from 'next/server';
import { getRefundlar, addRefund } from '@/lib/avia-storage';
import { appendToSheet } from '@/lib/gsheet';
import type { Refund } from '@/types/avia';

export async function GET() {
  try {
    return NextResponse.json({ refundlar: getRefundlar() });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const today = new Date().toISOString().split('T')[0];

    const item: Refund = {
      id: `RFD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: today,
      biletRaqam: body.biletRaqam || '',
      mijozIsmi: body.mijozIsmi || '',
      summa: Number(body.summa) || 0,
      izoh: body.izoh || '',
    };

    const all = addRefund(item);

    // Google Sheets'ga nusxa (Tolovlar sheetga REFUND deb yoziladi)
    appendToSheet('Tolovlar', [today, item.mijozIsmi, -item.summa, 'REFUND', item.biletRaqam, 'UZS', '', '', item.izoh || 'Refund']).catch(() => {});

    return NextResponse.json({ refund: item, total: all.length });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
