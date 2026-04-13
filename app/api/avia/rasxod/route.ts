import { NextRequest, NextResponse } from 'next/server';
import { getRasxodlar, addRasxod } from '@/lib/avia-storage';
import type { Rasxod } from '@/types/avia';

export async function GET() {
  try {
    return NextResponse.json({ rasxodlar: getRasxodlar() });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const today = new Date().toISOString().split('T')[0];

    const item: Rasxod = {
      id: `RSX-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: today,
      summa: Number(body.summa) || 0,
      sabab: body.sabab || '',
    };

    const all = addRasxod(item);
    return NextResponse.json({ rasxod: item, total: all.length });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
