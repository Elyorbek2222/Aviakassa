import { NextRequest, NextResponse } from 'next/server';
import { getTurizmDoc, saveTurizmDoc, listTurizmOylar } from '@/lib/avia-storage';
import { requireRole } from '@/lib/api-auth';
import { toNumber, toText } from '@/lib/validate';
import { todayStr, ticketEditRemainingMs } from '@/lib/utils';
import { logChange } from '@/lib/audit';
import { resolveZayavka, createPayment, deletePayment } from '@/lib/uon';
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

// DELETE ?oy=YYYY-MM&id=... — xato yozuvni o'chirish (U-ON to'lovi ham o'chiriladi).
// Ruxsat: admin — istalgan vaqt; sardor — 48 soat ichida.
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;

    const sp = new URL(request.url).searchParams;
    const oy = sp.get('oy');
    const id = sp.get('id');
    if (!oy || !id) return NextResponse.json({ error: 'oy va id kerak' }, { status: 400 });

    const doc = await getTurizmDoc(oy);
    const before = doc.yozuvlar.find((y) => y.id === id);
    if (!before) return NextResponse.json({ error: 'Yozuv topilmadi' }, { status: 404 });

    if (auth.role !== 'admin' && ticketEditRemainingMs(before) <= 0) {
      return NextResponse.json({ error: '48 soatlik muddat tugagan' }, { status: 403 });
    }

    // U-ON to'lovini avval o'chiramiz (asosiy manba). Muvaffaqiyatsiz bo'lsa — to'xtaymiz.
    if (before.uonPaymentId) {
      try {
        const res = await deletePayment(before.uonPaymentId);
        if (!res.ok) return NextResponse.json({ error: `U-ON: ${res.error}` }, { status: 502 });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "U-ON bilan bog'lanib bo'lmadi" }, { status: 502 });
      }
    }

    doc.yozuvlar = doc.yozuvlar.filter((y) => y.id !== id);
    await saveTurizmDoc(doc);
    logChange(auth, 'delete', 'turizm', id, `Turizm ${before.tur} o'chirildi (zayavka ${before.zayavka}): ${before.summa.toLocaleString('ru-RU')}${before.valyuta ? ' ' + before.valyuta : ''}`, { before }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// PATCH — yozuvni tahrirlash. U-ON'da payment/update yo'q → eski to'lovni o'chirib,
// yangisini yaratamiz. Ruxsat: admin — istalgan vaqt; sardor — 48 soat ichida.
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const oy = toText(body.oy);
    const id = toText(body.id);
    if (!oy || !id) return NextResponse.json({ error: 'oy va id kerak' }, { status: 400 });

    const doc = await getTurizmDoc(oy);
    const existing = doc.yozuvlar.find((y) => y.id === id);
    if (!existing) return NextResponse.json({ error: 'Yozuv topilmadi' }, { status: 404 });

    if (auth.role !== 'admin' && ticketEditRemainingMs(existing) <= 0) {
      return NextResponse.json({ error: '48 soatlik tahrirlash muddati tugagan' }, { status: 403 });
    }

    // Yangi qiymatlar (berilmasa — eskisi qoladi)
    const tur: TurizmTur = body.tur === 'rasxod' ? 'rasxod' : body.tur === 'prixot' ? 'prixot' : existing.tur;
    const summa = body.summa !== undefined ? toNumber(body.summa) : existing.summa;
    if (summa === null || summa <= 0) return NextResponse.json({ error: "Summa 0 dan katta bo'lishi kerak" }, { status: 400 });

    const sana = toText(body.sana) || existing.sana;
    const newOy = sana.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(newOy)) return NextResponse.json({ error: "Sana noto'g'ri (YYYY-MM-DD)" }, { status: 400 });

    const currencyId = body.currencyId !== undefined ? (toNumber(body.currencyId) ?? undefined) : existing.currencyId;
    const kursN = body.kurs !== undefined ? toNumber(body.kurs) : (existing.kurs ?? null);
    const kurs = kursN && kursN > 0 ? kursN : undefined;
    const summaUzs = kurs ? Math.round(summa * kurs) : summa;
    const partnerId = body.partnerId !== undefined ? (toNumber(body.partnerId) ?? undefined) : existing.partnerId;
    const partnerNomi = body.partnerNomi !== undefined ? (toText(body.partnerNomi) || undefined) : existing.partnerNomi;
    const cashId = body.cashId !== undefined ? (toNumber(body.cashId) ?? undefined) : existing.cashId;
    const formId = body.formId !== undefined ? (toNumber(body.formId) ?? undefined) : existing.formId;
    const valyuta = body.valyuta !== undefined ? (toText(body.valyuta) || undefined) : existing.valyuta;
    const izoh = body.izoh !== undefined ? (toText(body.izoh) || undefined) : existing.izoh;

    // 1) Eski U-ON to'lovini o'chirish
    if (existing.uonPaymentId) {
      try {
        const del = await deletePayment(existing.uonPaymentId);
        if (!del.ok) return NextResponse.json({ error: `U-ON o'chirishda: ${del.error}` }, { status: 502 });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "U-ON bilan bog'lanib bo'lmadi" }, { status: 502 });
      }
    }

    // 2) Yangi U-ON to'lovi. Muvaffaqiyatsiz bo'lsa — eski to'lov allaqachon o'chgan,
    //    izchillik uchun mahalliy yozuvni ham o'chiramiz va aniq xato qaytaramiz.
    let paymentId: string | undefined;
    try {
      const res = await createPayment({
        rId: existing.rId, isPrixot: tur === 'prixot', price: summa,
        currencyId, koef: kurs, supplierId: partnerId, cashId, formId, date: sana, reason: izoh,
      });
      if (!res.ok) {
        doc.yozuvlar = doc.yozuvlar.filter((y) => y.id !== id);
        await saveTurizmDoc(doc);
        return NextResponse.json({ error: `U-ON: ${res.error}. Eski to'lov o'chirildi — qayta kiriting.` }, { status: 502 });
      }
      paymentId = res.paymentId;
    } catch (e) {
      doc.yozuvlar = doc.yozuvlar.filter((y) => y.id !== id);
      await saveTurizmDoc(doc);
      return NextResponse.json({ error: (e instanceof Error ? e.message : 'U-ON xatosi') + " — eski to'lov o'chirildi, qayta kiriting." }, { status: 502 });
    }

    const updated: TurizmYozuv = {
      ...existing,
      sana, tur, summa, kurs, summaUzs, valyuta, currencyId, partnerId, partnerNomi, cashId, formId, izoh,
      uonPaymentId: paymentId,
    };

    // 3) Saqlash. Oy o'zgargan bo'lsa — yozuvni yangi oy hujjatiga ko'chiramiz.
    if (newOy === oy) {
      doc.yozuvlar = doc.yozuvlar.map((y) => (y.id === id ? updated : y));
      await saveTurizmDoc(doc);
    } else {
      doc.yozuvlar = doc.yozuvlar.filter((y) => y.id !== id);
      await saveTurizmDoc(doc);
      const target = await getTurizmDoc(newOy);
      target.yozuvlar.push(updated);
      await saveTurizmDoc(target);
    }

    logChange(auth, 'update', 'turizm', id, `Turizm tahrirlandi (zayavka ${existing.zayavka}): ${summa.toLocaleString('ru-RU')}${valyuta ? ' ' + valyuta : ''}`, { before: existing, after: updated }).catch(() => {});
    return NextResponse.json({ yozuv: updated });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
