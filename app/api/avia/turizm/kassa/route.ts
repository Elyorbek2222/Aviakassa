import { NextRequest, NextResponse } from 'next/server';
import { getAllTurizmYozuvlar, getTurizmKassa, addTurizmKassa, deleteTurizmKassa } from '@/lib/avia-storage';
import { requireRole } from '@/lib/api-auth';
import { toNumber, toText } from '@/lib/validate';
import { todayStr, ticketEditRemainingMs } from '@/lib/utils';
import { logChange } from '@/lib/audit';
import {
  TURIZM_HISOBLAR, hisobValyuta, hisobNaxtmi,
  turizmPostings, turizmQoldiq,
} from '@/lib/turizm-kassa';
import { TURIZM_HISOB_LABEL, TURIZM_KASSA_TUR_LABEL, TURIZM_OTDELLAR, type TurizmHisob, type TurizmKassaTur, type TurizmKassaYozuv, type TurizmOtdel } from '@/types/avia';

const KASSA_TURLAR: TurizmKassaTur[] = ['boshlangich', 'perevod', 'obmen', 'inkassatsiya', 'oylik'];
const isHisob = (v: unknown): v is TurizmHisob => TURIZM_HISOBLAR.includes(v as TurizmHisob);
const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU');

// GET — barcha ichki kassa jurnali yozuvlari (eng yangisi birinchi).
export async function GET() {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;
    const rows = await getTurizmKassa();
    rows.sort((a, b) => (a.sana < b.sana ? 1 : a.sana > b.sana ? -1 : (a.id < b.id ? 1 : -1)));
    return NextResponse.json({ yozuvlar: rows });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST — yangi ichki operatsiya. Har tur o'z validatsiyasi + qoldiq guard'i bilan.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const tur = body.tur as TurizmKassaTur;
    if (!KASSA_TURLAR.includes(tur)) {
      return NextResponse.json({ error: "Operatsiya turi noto'g'ri" }, { status: 400 });
    }
    const sana = toText(body.sana) || todayStr();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sana)) {
      return NextResponse.json({ error: "Sana noto'g'ri (YYYY-MM-DD)" }, { status: 400 });
    }
    const izoh = toText(body.izoh) || undefined;

    // Guard uchun joriy holat (yangi yozuvdan oldingi qoldiqlar)
    const balance = async (h: TurizmHisob) => {
      const [yoz, kassa] = await Promise.all([getAllTurizmYozuvlar(), getTurizmKassa()]);
      return turizmQoldiq(turizmPostings(yoz, kassa), h);
    };
    const yetarli = async (h: TurizmHisob, need: number): Promise<NextResponse | null> => {
      if (body.allowNegative) return null;
      const mavjud = await balance(h);
      if (need > mavjud + 1e-6) {
        return NextResponse.json(
          { error: `${TURIZM_HISOB_LABEL[h]} xolatida yetarli mablag' yo'q. Mavjud: ${fmt(mavjud)}`, insufficient: true, mavjud },
          { status: 409 },
        );
      }
      return null;
    };

    const base = {
      id: `TKS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana, tur, izoh, yaratdi: auth.name,
    };
    let item: TurizmKassaYozuv;
    let summary: string;

    if (tur === 'boshlangich') {
      const to = body.to;
      if (!isHisob(to)) return NextResponse.json({ error: 'Xolat tanlanmagan' }, { status: 400 });
      const summa = toNumber(body.summa);
      if (summa === null || summa < 0) return NextResponse.json({ error: "Summa manfiy bo'lishi mumkin emas" }, { status: 400 });
      item = { ...base, to, summa };
      summary = `Boshlang'ich qoldiq — ${TURIZM_HISOB_LABEL[to]}: ${fmt(summa)}`;

    } else if (tur === 'perevod') {
      const from = body.from, to = body.to;
      if (!isHisob(from) || !isHisob(to)) return NextResponse.json({ error: 'Xolatlar tanlanmagan' }, { status: 400 });
      if (from === to) return NextResponse.json({ error: 'Bir xil xolatlar orasida perevod bo\'lmaydi' }, { status: 400 });
      if (hisobValyuta(from) !== hisobValyuta(to)) {
        return NextResponse.json({ error: 'Perevod bir valyuta ichida bo\'ladi — valyuta almashtirish uchun Obmen ishlating' }, { status: 400 });
      }
      const summa = toNumber(body.summa);
      if (summa === null || summa <= 0) return NextResponse.json({ error: "Summa 0 dan katta bo'lishi kerak" }, { status: 400 });
      const guard = await yetarli(from, summa);
      if (guard) return guard;
      item = { ...base, from, to, summa };
      summary = `Perevod ${TURIZM_HISOB_LABEL[from]} → ${TURIZM_HISOB_LABEL[to]}: ${fmt(summa)}`;

    } else if (tur === 'obmen') {
      const from = body.from, to = body.to;
      if (!isHisob(from) || !isHisob(to)) return NextResponse.json({ error: 'Xolatlar tanlanmagan' }, { status: 400 });
      if (hisobValyuta(from) !== 'usd' || hisobValyuta(to) !== 'uzs') {
        return NextResponse.json({ error: 'Obmen: USD xolatdan UZS xolatga (masalan USD naqd → so\'m naqd)' }, { status: 400 });
      }
      const usdSumma = toNumber(body.summa ?? body.usdSumma);
      const kurs = toNumber(body.kurs);
      if (usdSumma === null || usdSumma <= 0) return NextResponse.json({ error: "USD summasi 0 dan katta bo'lishi kerak" }, { status: 400 });
      if (kurs === null || kurs <= 0) return NextResponse.json({ error: "Kurs 0 dan katta bo'lishi kerak" }, { status: 400 });
      const guard = await yetarli(from, usdSumma);
      if (guard) return guard;
      const toSumma = Math.round(usdSumma * kurs); // server hisoblaydi
      item = { ...base, from, to, summa: usdSumma, kurs, toSumma };
      summary = `Obmen ${TURIZM_HISOB_LABEL[from]} → ${TURIZM_HISOB_LABEL[to]}: $${fmt(usdSumma)} × ${fmt(kurs)} = ${fmt(toSumma)} so'm`;

    } else if (tur === 'inkassatsiya') {
      const from = body.from;
      if (!isHisob(from)) return NextResponse.json({ error: 'Xolat tanlanmagan' }, { status: 400 });
      if (!hisobNaxtmi(from)) return NextResponse.json({ error: 'Inkassatsiya faqat naqd xolatdan bo\'ladi' }, { status: 400 });
      const summa = toNumber(body.summa);
      if (summa === null || summa <= 0) return NextResponse.json({ error: "Summa 0 dan katta bo'lishi kerak" }, { status: 400 });
      const guard = await yetarli(from, summa);
      if (guard) return guard;
      item = { ...base, from, summa };
      summary = `Inkassatsiya ${TURIZM_HISOB_LABEL[from]}: ${fmt(summa)}`;

    } else { // oylik
      const from = body.from;
      if (!isHisob(from)) return NextResponse.json({ error: 'Xolat tanlanmagan' }, { status: 400 });
      const summa = toNumber(body.summa);
      if (summa === null || summa <= 0) return NextResponse.json({ error: "Summa 0 dan katta bo'lishi kerak" }, { status: 400 });
      const xodim = toText(body.xodim) || undefined;
      const otdel = TURIZM_OTDELLAR.includes(body.otdel as TurizmOtdel) ? (body.otdel as TurizmOtdel) : undefined;
      const xodimId = toText(body.xodimId) || undefined;
      const guard = await yetarli(from, summa);
      if (guard) return guard;
      item = { ...base, from, summa, xodim, otdel, xodimId };
      summary = `Oylik${xodim ? ' — ' + xodim : ''} (${TURIZM_HISOB_LABEL[from]}): ${fmt(summa)}`;
    }

    await addTurizmKassa(item);
    logChange(auth, 'create', 'turizm-kassa', item.id, `${TURIZM_KASSA_TUR_LABEL[tur]}: ${summary}`, { after: item }).catch(() => {});
    return NextResponse.json({ yozuv: item });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// DELETE ?id=... — xato yozuvni o'chirish. admin — doim; sardor — 48 soat ichida.
// (Ichki jurnal tahriri = o'chirib qayta kiritish; U-ON'ga tegmaydi.)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const rows = await getTurizmKassa();
    const before = rows.find((r) => r.id === id);
    if (!before) return NextResponse.json({ error: 'Yozuv topilmadi' }, { status: 404 });

    if (auth.role !== 'admin' && ticketEditRemainingMs(before) <= 0) {
      return NextResponse.json({ error: '48 soatlik muddat tugagan' }, { status: 403 });
    }

    await deleteTurizmKassa(id);
    logChange(auth, 'delete', 'turizm-kassa', id, `${TURIZM_KASSA_TUR_LABEL[before.tur]} o'chirildi: ${fmt(before.summa)}`, { before }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
