import { NextRequest, NextResponse } from 'next/server';
import { getInkassatsiya, addInkassatsiya } from '@/lib/avia-storage';
import { appendToSheet } from '@/lib/gsheet';
import { requireRole } from '@/lib/api-auth';
import { todayStr } from '@/lib/utils';
import { validateAmount } from '@/lib/validate';
import { AIRLINE_LABELS, type Inkassatsiya, type AirlineKey, type InkassatsiyaTuri } from '@/types/avia';

// GET: return all inkassatsiya
export async function GET() {
  try {
    const items = await getInkassatsiya();
    return NextResponse.json({ inkassatsiya: items });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST: add single inkassatsiya
export async function POST(request: NextRequest) {
  try {
    // Inkassatsiya — admin, Finansist (kassir) yoki Buxgalter.
    const auth = await requireRole(['admin', 'kassir', 'buxgalter']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const today = todayStr();

    const summaRes = validateAmount(body.summa, 'Summa');
    if (!summaRes.ok) return NextResponse.json({ error: summaRes.error }, { status: 400 });

    const turi: InkassatsiyaTuri = body.turi === 'kassa' ? 'kassa' : 'aviakompaniya';
    const airlineKey = body.airline as AirlineKey;
    const airlineName = turi === 'kassa'
      ? (body.airlineName || 'Kassa topshirish')
      : (AIRLINE_LABELS[airlineKey] || body.airlineName || '');

    const item: Inkassatsiya = {
      id: `INK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: today,
      airline: airlineKey,
      airlineName,
      summa: summaRes.value,
      izoh: body.izoh || '',
      turi,
    };

    const items = await addInkassatsiya(item);

    // Google Sheets'ga yozish
    appendToSheet('Inkassatsiya', [today, airlineName, item.summa, item.izoh]).catch(() => {});

    return NextResponse.json({ inkassatsiya: item, total: items.length });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
