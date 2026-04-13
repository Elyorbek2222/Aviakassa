import { NextRequest, NextResponse } from 'next/server';
import { getInkassatsiya, addInkassatsiya } from '@/lib/avia-storage';
import { appendToSheet } from '@/lib/gsheet';
import { AIRLINE_LABELS, type Inkassatsiya, type AirlineKey } from '@/types/avia';

// GET: return all inkassatsiya
export async function GET() {
  try {
    const items = getInkassatsiya();
    return NextResponse.json({ inkassatsiya: items });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST: add single inkassatsiya
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const today = new Date().toISOString().split('T')[0];

    const airlineKey = body.airline as AirlineKey;
    const airlineName = AIRLINE_LABELS[airlineKey] || body.airlineName || '';

    const item: Inkassatsiya = {
      id: `INK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: today,
      airline: airlineKey,
      airlineName,
      summa: Number(body.summa) || 0,
      izoh: body.izoh || '',
    };

    const items = addInkassatsiya(item);

    // Google Sheets'ga yozish
    appendToSheet('Inkassatsiya', [today, airlineName, item.summa, item.izoh]).catch(() => {});

    return NextResponse.json({ inkassatsiya: item, total: items.length });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
