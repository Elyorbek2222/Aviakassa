import { NextRequest, NextResponse } from 'next/server';
import { getAllTurizmYozuvlar, getTurizmKassa } from '@/lib/avia-storage';
import { requireRole } from '@/lib/api-auth';
import { todayStr } from '@/lib/utils';
import { turizmPostings, turizmBalanslar, TURIZM_HISOBLAR } from '@/lib/turizm-kassa';

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD — 4 xolat qoldig'i (kun boshi → kun oxiri).
// Ostatka saqlanmaydi: har o'qishda prixot/rasxod (TurizmYozuv) + ichki jurnal
// (turizm_kassa) yozuvlaridan hisoblanadi.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;

    const sp = new URL(request.url).searchParams;
    const from = sp.get('from') || undefined;
    const to = sp.get('to') || undefined;

    const [yozuvlar, kassa] = await Promise.all([getAllTurizmYozuvlar(), getTurizmKassa()]);
    const postings = turizmPostings(yozuvlar, kassa);
    const balanslar = turizmBalanslar(postings, from, to);

    return NextResponse.json({
      today: todayStr(),
      from: from ?? null,
      to: to ?? null,
      hisoblar: TURIZM_HISOBLAR,
      balanslar,
    });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
