import { NextRequest, NextResponse } from 'next/server';
import { getPrixotDoc, savePrixotDoc, listPrixotOylar, listOtchotlar } from '@/lib/avia-storage';
import { requireRole } from '@/lib/api-auth';
import { toNumber, toText } from '@/lib/validate';
import { todayStr } from '@/lib/utils';
import { logChange } from '@/lib/audit';
import type { PrixotYozuv, PrixotTur } from '@/types/avia';

const TURLAR: PrixotTur[] = ['bilet', 'otkazma', 'obmen', 'foyda', 'tur', 'boshqa'];
const asTur = (v: unknown): PrixotTur => (TURLAR.includes(v as PrixotTur) ? (v as PrixotTur) : 'boshqa');

// Shu oyning aviakompaniya otchoti begzod summasi (farq hisoblash uchun)
async function otchotBegSum(oy: string): Promise<number> {
  const list = await listOtchotlar();
  const it = list.find((x) => x.oy === oy);
  return it?.sverka?.begSum ?? 0;
}

// GET ?oy=YYYY-MM — o'sha oy yozuvlari; aks holda mavjud oylar ro'yxati.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;
    const oy = new URL(request.url).searchParams.get('oy');
    if (oy) {
      const doc = await getPrixotDoc(oy);
      return NextResponse.json({ oy, yozuvlar: doc.yozuvlar, otchotBegSum: await otchotBegSum(oy) });
    }
    return NextResponse.json({ oylar: await listPrixotOylar() });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST — yangi qator qo'shish (faqat admin)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const oy = toText(body.oy);
    if (!oy || !/^\d{4}-\d{2}$/.test(oy)) return NextResponse.json({ error: 'oy (YYYY-MM) kerak' }, { status: 400 });

    const summa = toNumber(body.summa);
    if (summa === null || summa < 0) return NextResponse.json({ error: "Summa noto'g'ri" }, { status: 400 });

    const item: PrixotYozuv = {
      id: `PRX-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: toText(body.sana) || todayStr(),
      mijoz: toText(body.mijoz) || '',
      summa,
      tur: asTur(body.tur),
      biletRaqam: toText(body.biletRaqam) || undefined,
      izoh: toText(body.izoh) || undefined,
    };

    const doc = await getPrixotDoc(oy);
    doc.yozuvlar.push(item);
    await savePrixotDoc(doc);
    logChange(auth, 'create', 'prixot', item.id, `Prixot qo'shildi (${oy}): ${item.mijoz} — ${item.summa.toLocaleString('ru-RU')}`, { after: item }).catch(() => {});
    return NextResponse.json({ yozuv: item });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// PATCH — mavjud qatorni tahrirlash (faqat admin)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const oy = toText(body.oy);
    const id = toText(body.id);
    if (!oy || !id) return NextResponse.json({ error: 'oy va id kerak' }, { status: 400 });

    const doc = await getPrixotDoc(oy);
    const idx = doc.yozuvlar.findIndex((y) => y.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Yozuv topilmadi' }, { status: 404 });
    const before = doc.yozuvlar[idx];

    let summa = before.summa;
    if (body.summa !== undefined) {
      const s = toNumber(body.summa);
      if (s === null || s < 0) return NextResponse.json({ error: "Summa noto'g'ri" }, { status: 400 });
      summa = s;
    }

    const updated: PrixotYozuv = {
      ...before,
      sana: body.sana !== undefined ? (toText(body.sana) || before.sana) : before.sana,
      mijoz: body.mijoz !== undefined ? (toText(body.mijoz) || '') : before.mijoz,
      summa,
      tur: body.tur !== undefined ? asTur(body.tur) : before.tur,
      biletRaqam: body.biletRaqam !== undefined ? (toText(body.biletRaqam) || undefined) : before.biletRaqam,
      izoh: body.izoh !== undefined ? (toText(body.izoh) || undefined) : before.izoh,
    };
    doc.yozuvlar[idx] = updated;
    await savePrixotDoc(doc);
    logChange(auth, 'update', 'prixot', id, `Prixot tahrirlandi (${oy}): ${updated.mijoz} — ${updated.summa.toLocaleString('ru-RU')}`, { before, after: updated }).catch(() => {});
    return NextResponse.json({ yozuv: updated });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// DELETE ?oy=YYYY-MM&id=... — qatorni o'chirish (faqat admin)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const sp = new URL(request.url).searchParams;
    const oy = sp.get('oy');
    const id = sp.get('id');
    if (!oy || !id) return NextResponse.json({ error: 'oy va id kerak' }, { status: 400 });

    const doc = await getPrixotDoc(oy);
    const before = doc.yozuvlar.find((y) => y.id === id);
    if (!before) return NextResponse.json({ error: 'Yozuv topilmadi' }, { status: 404 });
    doc.yozuvlar = doc.yozuvlar.filter((y) => y.id !== id);
    await savePrixotDoc(doc);
    logChange(auth, 'delete', 'prixot', id, `Prixot o'chirildi (${oy}): ${before.mijoz} — ${before.summa.toLocaleString('ru-RU')}`, { before }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
