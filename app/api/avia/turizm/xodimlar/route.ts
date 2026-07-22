import { NextRequest, NextResponse } from 'next/server';
import { getTurizmXodimlar, saveTurizmXodimlar } from '@/lib/avia-storage';
import { requireRole } from '@/lib/api-auth';
import { toNumber, toText } from '@/lib/validate';
import { logChange } from '@/lib/audit';
import { TURIZM_OTDELLAR, TURIZM_OTDEL_LABEL, type TurizmOtdel, type TurizmXodim } from '@/types/avia';

const isOtdel = (v: unknown): v is TurizmOtdel => TURIZM_OTDELLAR.includes(v as TurizmOtdel);
const isValyuta = (v: unknown): v is 'uzs' | 'usd' => v === 'uzs' || v === 'usd';
const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU');

// GET — xodimlar ro'yxati
export async function GET() {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;
    const { xodimlar } = await getTurizmXodimlar();
    return NextResponse.json({ xodimlar });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST — yangi xodim
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const ism = toText(body.ism);
    if (!ism) return NextResponse.json({ error: 'Ism kiritilmagan' }, { status: 400 });
    if (!isOtdel(body.otdel)) return NextResponse.json({ error: "Bo'lim noto'g'ri" }, { status: 400 });
    const oylik = toNumber(body.oylik);
    if (oylik === null || oylik < 0) return NextResponse.json({ error: "Oylik manfiy bo'lishi mumkin emas" }, { status: 400 });
    const valyuta = isValyuta(body.valyuta) ? body.valyuta : 'uzs';
    const uonManagerId = toNumber(body.uonManagerId) ?? undefined;
    const kpiN = toNumber(body.kpiFoiz);
    const kpiFoiz = kpiN !== null && kpiN >= 0 ? kpiN : undefined;

    const item: TurizmXodim = {
      id: `XDM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ism, otdel: body.otdel, oylik, valyuta, faol: true, uonManagerId, kpiFoiz,
    };
    const doc = await getTurizmXodimlar();
    doc.xodimlar.push(item);
    await saveTurizmXodimlar(doc);
    logChange(auth, 'create', 'turizm-oylik', item.id, `Xodim qo'shildi: ${ism} (${TURIZM_OTDEL_LABEL[item.otdel]}) — ${fmt(oylik)} ${valyuta.toUpperCase()}`, { after: item }).catch(() => {});
    return NextResponse.json({ xodim: item });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// PATCH — xodimni tahrirlash (oylik/bo'lim/ism/valyuta/faol)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const id = toText(body.id);
    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const doc = await getTurizmXodimlar();
    const existing = doc.xodimlar.find((x) => x.id === id);
    if (!existing) return NextResponse.json({ error: 'Xodim topilmadi' }, { status: 404 });

    if (body.ism !== undefined) { const v = toText(body.ism); if (!v) return NextResponse.json({ error: 'Ism kiritilmagan' }, { status: 400 }); existing.ism = v; }
    if (body.otdel !== undefined) { if (!isOtdel(body.otdel)) return NextResponse.json({ error: "Bo'lim noto'g'ri" }, { status: 400 }); existing.otdel = body.otdel; }
    if (body.oylik !== undefined) { const v = toNumber(body.oylik); if (v === null || v < 0) return NextResponse.json({ error: "Oylik noto'g'ri" }, { status: 400 }); existing.oylik = v; }
    if (body.valyuta !== undefined && isValyuta(body.valyuta)) existing.valyuta = body.valyuta;
    if (body.faol !== undefined) existing.faol = !!body.faol;
    if (body.uonManagerId !== undefined) { const v = toNumber(body.uonManagerId); existing.uonManagerId = v ?? undefined; }
    if (body.kpiFoiz !== undefined) { const v = toNumber(body.kpiFoiz); existing.kpiFoiz = v !== null && v >= 0 ? v : undefined; }

    await saveTurizmXodimlar(doc);
    logChange(auth, 'update', 'turizm-oylik', id, `Xodim tahrirlandi: ${existing.ism} — ${fmt(existing.oylik)} ${existing.valyuta.toUpperCase()}`, { after: existing }).catch(() => {});
    return NextResponse.json({ xodim: existing });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// DELETE ?id=... — xodimni ro'yxatdan o'chirish (to'lov tarixi TKS yozuvlarida qoladi)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const doc = await getTurizmXodimlar();
    const before = doc.xodimlar.find((x) => x.id === id);
    if (!before) return NextResponse.json({ error: 'Xodim topilmadi' }, { status: 404 });

    doc.xodimlar = doc.xodimlar.filter((x) => x.id !== id);
    await saveTurizmXodimlar(doc);
    logChange(auth, 'delete', 'turizm-oylik', id, `Xodim o'chirildi: ${before.ism}`, { before }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
