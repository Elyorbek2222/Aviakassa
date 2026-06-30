import { NextResponse } from 'next/server';
import { getAprelSverka } from '@/lib/avia-storage';

// Aprel 2026 oylik sverka otchoti — Begzod (aviakassir) ledger'ini
// aviakompaniya/manba hisobotlari bilan bilet raqami bo'yicha solishtirish natijasi.
export async function GET() {
  try {
    const data = await getAprelSverka();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
