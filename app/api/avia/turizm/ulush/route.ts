import { NextRequest, NextResponse } from 'next/server';
import { getTurizmUlush, saveTurizmUlush } from '@/lib/avia-storage';
import { requireRole } from '@/lib/api-auth';
import { toNumber } from '@/lib/validate';
import { logChange } from '@/lib/audit';

// GET — barcha ulush overrides ({ [rId]: percent })
export async function GET() {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;
    return NextResponse.json({ ulush: await getTurizmUlush() });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST { rId, ulush } — zayavka bo'yicha menejer ulushini (0..100) o'rnatish.
// 100% = default, saqlanmaydi (o'chiriladi).
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const rId = String(body.rId ?? '').trim();
    if (!rId) return NextResponse.json({ error: 'rId kerak' }, { status: 400 });
    const u = toNumber(body.ulush);
    if (u === null || u < 0 || u > 100) return NextResponse.json({ error: "Ulush 0..100 oralig'ida bo'lishi kerak" }, { status: 400 });

    const map = await getTurizmUlush();
    if (u === 100) delete map[rId]; else map[rId] = u;
    await saveTurizmUlush(map);
    logChange(auth, 'update', 'turizm-oylik', `ulush-${rId}`, `Zayavka ${rId} ulush: ${u}%`, {}).catch(() => {});
    return NextResponse.json({ ok: true, rId, ulush: u });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
