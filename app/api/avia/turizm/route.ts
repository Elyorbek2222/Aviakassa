import { NextRequest, NextResponse } from 'next/server';
import { getTurizmDoc, saveTurizmDoc, listTurizmOylar } from '@/lib/avia-storage';
import { requireRole } from '@/lib/api-auth';
import { toNumber, toText } from '@/lib/validate';
import { todayStr } from '@/lib/utils';
import { logChange } from '@/lib/audit';
import { resolveZayavka, createPayment } from '@/lib/uon';
import type { TurizmYozuv, TurizmTur } from '@/types/avia';

// GET ?oy=YYYY-MM — o'sha oy yozuvlari; aks holda mavjud oylar ro'yxati.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;
    const oy = new URL(request.url).searchParams.get('oy');
    if (oy) {
      const doc = await getTurizmDoc(oy);
      return NextResponse.json({ oy, yozuvlar: doc.yozuvlar });
    }
    return NextResponse.json({ oylar: await listTurizmOylar() });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST — prixot/rasxod kiritish. STRICT: avval U-ON'ga yoziladi, faqat muvaffaqiyatda
// Supabase'ga (hisobot nusxasi) saqlanadi. U-ON = asosiy manba.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    const zayavka = toText(body.zayavka);
    if (!zayavka) return NextResponse.json({ error: 'Zayavka nomeri kerak' }, { status: 400 });

    const tur: TurizmTur = body.tur === 'rasxod' ? 'rasxod' : body.tur === 'prixot' ? 'prixot' : (null as unknown as TurizmTur);
    if (!tur) return NextResponse.json({ error: "Tur noto'g'ri (prixot yoki rasxod)" }, { status: 400 });

    const summa = toNumber(body.summa);
    if (summa === null || summa <= 0) return NextResponse.json({ error: "Summa 0 dan katta bo'lishi kerak" }, { status: 400 });

    const sana = toText(body.sana) || todayStr();
    const oy = sana.slice(0, 7); // YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(oy)) return NextResponse.json({ error: "Sana noto'g'ri (YYYY-MM-DD)" }, { status: 400 });

    const currencyId = toNumber(body.currencyId) ?? undefined;
    const partnerId = toNumber(body.partnerId) ?? undefined;
    const cashId = toNumber(body.cashId) ?? undefined;
    const formId = toNumber(body.formId) ?? undefined;
    const valyuta = toText(body.valyuta) || undefined;
    const partnerNomi = toText(body.partnerNomi) || undefined;
    const izoh = toText(body.izoh) || undefined;
    // Kurs: valyuta so'mdan boshqa bo'lsa kiritiladi. So'm ekvivalenti = summa × kurs
    // (kurs yo'q bo'lsa summaning o'zi — so'm deb qabul qilinadi).
    const kursNum = toNumber(body.kurs);
    const kurs = kursNum && kursNum > 0 ? kursNum : undefined;
    const summaUzs = kurs ? Math.round(summa * kurs) : summa;
    const mijoz = toText(body.mijoz) || undefined;
    const xizmat = toText(body.xizmat) || undefined;

    // 1) Zayavka U-ON'da mavjudmi?
    let rId: number | null;
    try {
      rId = await resolveZayavka(zayavka);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'U-ON bilan bog\'lanib bo\'lmadi' }, { status: 502 });
    }
    if (rId === null) return NextResponse.json({ error: `Zayavka U-ON'da topilmadi: ${zayavka}` }, { status: 404 });

    // 2) U-ON'ga to'lov yozamiz (strict — muvaffaqiyatsiz bo'lsa saqlamaymiz)
    let paymentId: string | undefined;
    try {
      const res = await createPayment({
        rId,
        isPrixot: tur === 'prixot',
        price: summa,
        currencyId,
        koef: kurs,
        supplierId: partnerId,
        cashId,
        formId,
        date: sana,
        reason: izoh,
      });
      if (!res.ok) return NextResponse.json({ error: `U-ON: ${res.error}` }, { status: 502 });
      paymentId = res.paymentId;
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'U-ON bilan bog\'lanib bo\'lmadi' }, { status: 502 });
    }

    // 3) Supabase'ga nusxa (hisobot uchun)
    const item: TurizmYozuv = {
      id: `TUR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana,
      zayavka,
      rId,
      tur,
      summa,
      kurs,
      summaUzs,
      mijoz,
      xizmat,
      valyuta,
      currencyId,
      partnerId,
      partnerNomi,
      cashId,
      formId,
      izoh,
      uonPaymentId: paymentId,
      yaratdi: auth.name,
    };
    const doc = await getTurizmDoc(oy);
    doc.yozuvlar.push(item);
    await saveTurizmDoc(doc);

    logChange(auth, 'create', 'turizm', item.id, `Turizm ${tur} (zayavka ${zayavka}): ${summa.toLocaleString('ru-RU')}${valyuta ? ' ' + valyuta : ''}`, { after: item }).catch(() => {});
    return NextResponse.json({ yozuv: item });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
