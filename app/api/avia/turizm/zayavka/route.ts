import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getZayavkaInfo } from '@/lib/uon';

// GET ?nomer=8641 — zayavka mijozi + uslugalari + summasi (forma lookup, to'lov
// yozishdan oldin tekshirish uchun). Topilmasa 404.
export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'sardor']);
  if (auth instanceof NextResponse) return auth;

  const nomer = new URL(request.url).searchParams.get('nomer');
  if (!nomer) return NextResponse.json({ error: 'Zayavka nomeri kerak' }, { status: 400 });

  try {
    const info = await getZayavkaInfo(nomer);
    if (!info) return NextResponse.json({ error: `Zayavka U-ON'da topilmadi: ${nomer}` }, { status: 404 });
    return NextResponse.json({ info });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "U-ON bilan bog'lanib bo'lmadi" }, { status: 502 });
  }
}
