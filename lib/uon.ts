// U-ON Travel CRM API klienti (SEM Travel turizm bo'limi uchun).
//
// Doc: https://api.u-on.ru/doc  — kalit URL ichida, faqat HTTPS, maks 10 so'rov/sek.
// Format: `https://api.u-on.ru/{KALIT}/{metod}.json`. POST — form-urlencoded.
//
// Bu yerda faqat turizm prixot/rasxod oqimiga kerakli metodlar:
//   - zayavkani tekshirish (request/{id})
//   - to'lov yaratish (payment/create): cio_id 1=prixot, 2=rasxod; r_id=zayavka
//   - dropdownlar uchun ma'lumotnomalar: /supplier, /currency, /cash, /payment_form
//
// Javob shakllari (wrapper kalitlari) hisobga xos bo'lishi mumkin — shuning uchun
// parsing himoyalangan (firstArray / success aniqlash). Aniq shakl jonli kalit
// bilan test qilinganda tasdiqlanadi.

import type { HisobotZayavka } from '@/types/avia';

const BASE = 'https://api.u-on.ru';

function apiKey(): string {
  const k = process.env.UON_API_KEY || '';
  if (!k) throw new Error('U-ON API kaliti sozlanmagan (UON_API_KEY)');
  return k;
}

// Ob'ekt ichidan birinchi ob'ektlar massivini topadi (U-ON list javoblari har xil
// wrapper kaliti ostida qaytaradi: {result, currency:[...]} / {suppliers:[...]} ...).
function firstArray(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object') {
    for (const v of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(v)) return v as Record<string, unknown>[];
    }
  }
  return [];
}

// U-ON create/GET javobi muvaffaqiyatli ekanini aniqlaydi.
function isOk(httpOk: boolean, data: unknown): boolean {
  if (!httpOk) return false;
  if (data && typeof data === 'object' && 'result' in data) {
    const r = (data as { result: unknown }).result;
    // result 200 / '200' / {code:200} / 'ok' — muvaffaqiyat; 4xx/5xx — xato
    if (typeof r === 'number') return r >= 200 && r < 300;
    if (typeof r === 'string') return r === '200' || r.toLowerCase() === 'ok' || r.toLowerCase() === 'success';
  }
  return true; // result maydoni yo'q bo'lsa — HTTP holatiga ishonamiz
}

function errText(data: unknown): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    // Matnni ichma-ich qidiramiz: string; yoki {message}/{text} (masalan {error:{message}}).
    const dig = (v: unknown): string | null => {
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
        if (typeof o.text === 'string' && o.text.trim()) return o.text.trim();
      }
      return null;
    };
    const m = dig(d.message) ?? dig(d.error) ?? dig(d.errors) ?? dig(d.text);
    if (m) return m;
    const raw = JSON.stringify(d);
    if (raw && raw !== '{}') return raw.slice(0, 200); // topilmasa — xom javob (qisqa)
  }
  return 'U-ON API xatosi';
}

// To'lov allaqachon yo'q (o'chirilgan) — xato emas, shu holatni aniqlaydi.
function tolovYoq(msg: string): boolean {
  return /not\s*found|no\s*such|not\s*exist|не\s*найден|отсутств|topilmadi/i.test(msg);
}

// U-ON xato matnlarini (ingliz/rus) foydalanuvchi tushunadigan o'zbekchага tarjima.
function uonXatoUz(msg: string): string {
  const m = msg.toLowerCase();
  if (tolovYoq(m)) return "To'lov U-ON'da topilmadi — allaqachon o'chirilgan bo'lishi mumkin";
  if (/method\s*not\s*allowed/.test(m)) return "U-ON so'rov usuli noto'g'ri (texnik xato) — dasturchiga xabar bering";
  if (/access|denied|forbidden|unauthor|доступ|запрещ|ключ|api\s*key|token/.test(m)) return "U-ON: ruxsat yo'q yoki API kalit noto'g'ri";
  if (/timeout|timed?\s*out|время|таймаут|gateway/.test(m)) return "U-ON javob bermadi (vaqt tugadi) — biroz kutib qayta urinib ko'ring";
  if (/currency|валют/.test(m)) return "U-ON: valyuta noto'g'ri tanlangan";
  if (/required|обязатель|must|empty|пуст|не\s*указан/.test(m)) return "U-ON: majburiy maydon to'ldirilmagan";
  if (/r_id|request.*not|заявк.*не/.test(m)) return "U-ON: zayavka topilmadi yoki noto'g'ri";
  return `U-ON xatosi: ${msg}`; // noma'lum — asl matn ham qoladi (dasturchi uchun)
}

async function uonGet(path: string): Promise<{ httpOk: boolean; data: unknown }> {
  const res = await fetch(`${BASE}/${apiKey()}/${path}.json`, { cache: 'no-store' });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* bo'sh/HTML javob */ }
  return { httpOk: res.ok, data };
}

async function uonPost(path: string, params: Record<string, string | number | undefined>): Promise<{ httpOk: boolean; data: unknown }> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') body.set(k, String(v));
  }
  const res = await fetch(`${BASE}/${apiKey()}/${path}.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* bo'sh/HTML javob */ }
  return { httpOk: res.ok, data };
}

export interface UonRef { id: number; name: string }

function toRefs(rows: Record<string, unknown>[], nameKeys: string[]): UonRef[] {
  return rows
    .map((r) => {
      const id = Number(r.id ?? r.ID);
      const name = String(nameKeys.map((k) => r[k]).find((v) => v) ?? `#${id}`);
      return { id, name };
    })
    .filter((r) => Number.isFinite(r.id));
}

// ===== Ma'lumotnomalar (dropdownlar) =====

// Barcha partnyorlar — U-ON `suppliers/{page}` bo'yicha sahifalab (har sahifa 100 ta;
// `supplier?page=` query e'tiborsiz qoladi, shuning uchun yo'l-shakli ishlatiladi).
export async function getSuppliers(): Promise<UonRef[]> {
  const all: Record<string, unknown>[] = [];
  for (let page = 1; page <= 50; page++) { // ponytail: 50-sahifa (5000) — amaliy backstop
    const { data } = await uonGet(`suppliers/${page}`);
    const rows = firstArray(data);
    all.push(...rows);
    if (rows.length < 100) break;
  }
  return toRefs(all, ['name', 'name_official', 'title']);
}

// SEM Travel faqat 2 valyuta: Узбекский сум (UZS) va Доллар США (USD). U-ON'da
// o'nlab valyuta bor — boshqa "dollar"lar (avstraliya/kanada/singapur...) ham
// chiqib qolmasin uchun USD ANIQ belgilanadi ("США"/"USD"/id=2), so'm birinchi.
export async function getCurrencies(): Promise<UonRef[]> {
  const { data } = await uonGet('currency');
  const all = toRefs(firstArray(data), ['name', 'title', 'code', 'short_name']);
  const uzs = all.find((c) => c.id === 18 || /\buzs\b|узбек|сум/i.test(c.name));
  const usd = all.find((c) => c.id === 2 || /\busd\b|сша/i.test(c.name))
           || all.find((c) => /доллар|dollar/i.test(c.name)); // zaxira: aniq topilmasa — birinchi dollar
  const only = [uzs, usd].filter(Boolean) as UonRef[];
  return only.length ? only : all; // hech biri topilmasa — hammasi (dropdown bo'sh qolmasin)
}

export async function getCashboxes(): Promise<UonRef[]> {
  const { data } = await uonGet('cash');
  return toRefs(firstArray(data), ['name', 'title']);
}

export async function getPaymentForms(): Promise<UonRef[]> {
  const { data } = await uonGet('payment_form');
  return toRefs(firstArray(data), ['name', 'title']);
}

// Menejerlar (U-ON `manager` — foydalanuvchilar). u_id zayavka manager_id bilan mos.
// KPI uchun xodimni shu id'ga bog'laymiz.
export async function getManagers(): Promise<UonRef[]> {
  const { data } = await uonGet('manager');
  return firstArray(data)
    .map((r) => {
      const id = Number(r.u_id ?? r.id);
      const name = [r.u_surname, r.u_name].map((x) => String(x ?? '').trim()).filter(Boolean).join(' ') || `#${id}`;
      return { id, name };
    })
    .filter((r) => Number.isFinite(r.id) && r.id > 0);
}

// ===== Zayavkani tekshirish =====
// Sardor kiritgan zayavka nomerini U-ON ichki request ID sifatida qabul qiladi va
// mavjudligini tekshiradi. Topilsa rId qaytadi, aks holda null.
// ponytail: U-ON'da zayavka nomeri = ichki id (ko'p hollarda). Agar hisobda alohida
// "ichki nomer" ishlatilsa — bu yerda ro'yxatdan qidirishga o'tiladi.
export async function resolveZayavka(nomer: string | number): Promise<number | null> {
  const n = Number(String(nomer).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  const { httpOk, data } = await uonGet(`request/${n}`);
  if (!httpOk) return null;
  // U-ON: haqiqiy zayavka -> {request:[{...}]}, mavjud emas -> {request:[]} (HTTP 200).
  // Shuning uchun bo'sh massiv = topilmadi (strict rejim buni bloklaydi).
  const rows = firstArray(data);
  if (rows.length === 0) return null;
  const id = Number(rows[0].id ?? rows[0].id_system ?? n);
  return Number.isFinite(id) && id > 0 ? id : n;
}

// ===== Zayavka ma'lumoti (mijoz + uslugalar) — forma lookup uchun =====
// Zayavka nomeri kiritilganda sardorga mijoz F.I.Sh + uslugalar + summani ko'rsatadi
// (nima uchun to'lov yozayotganini tekshirish). `request/{id}` javobida services
// inline keladi. Topilmasa null.

export interface ZayavkaService {
  name: string; price: number; currency: string; kurs: number;
  dateBegin?: string; dateEnd?: string; partner?: string;
}
export interface ZayavkaInfo {
  rId: number;
  nomer: string;
  mijoz: string;
  manager: string;
  status: string;
  xizmatlar: ZayavkaService[];
  sell: number;
  clientPaid: number;
  clientDebt: number;
  currencyId: number; // zayavka valyutasi — formaga mos (2=USD, 18=so'm)
  kurs: number;       // USD kursi (so'm bo'lsa 0)
  valyuta: string;    // 'USD' / "so'm"
}

// Xizmatlar U-ON request ichida inline (`services`). Har birida: service_type
// (Отель/Авиа...), hotel/city/country, sanalar, price + currency + rate (=KURS),
// partner_name. Nomni shu maydonlardan yasaymiz; kurs/valyuta prixotга avtomat qo'yiladi.
function parseServices(r: Record<string, unknown>): ZayavkaService[] {
  const raw = r.services ?? r.service;
  const rows = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  return rows
    .filter((s) => s && typeof s === 'object' && Number((s as Record<string, unknown>).is_active) !== 0)
    .map((s) => {
      const o = s as Record<string, unknown>;
      const parts = [
        String(o.service_type ?? '').trim(),                     // "Отель" / "Авиабилет" ...
        String(o.hotel ?? o.description ?? '').trim(),           // mehmonxona yoki izoh
        String(o.city ?? o.country ?? '').trim(),               // shahar/mamlakat
      ].filter(Boolean);
      const usd = Number(o.currency_id) === 2 || /usd|доллар/i.test(String(o.currency ?? ''));
      return {
        name: parts.join(' — ') || 'Xizmat',
        price: num(o.price),
        currency: usd ? 'USD' : String(o.currency ?? '').trim(),
        kurs: usd ? num(o.rate) : 0,
        dateBegin: String(o.date_begin ?? '').slice(0, 10) || undefined,
        dateEnd: String(o.date_end ?? '').slice(0, 10) || undefined,
        partner: String(o.partner_name ?? '').trim() || undefined,
      };
    });
}

export async function getZayavkaInfo(nomer: string | number): Promise<ZayavkaInfo | null> {
  const n = Number(String(nomer).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  const { httpOk, data } = await uonGet(`request/${n}`);
  if (!httpOk) return null;
  const rows = firstArray(data);
  if (rows.length === 0) return null;
  const r = rows[0];
  const z = mapZayavka(r);
  const xizmatlar = parseServices(r);
  // Zayavka valyutasi/kursi — eng qimmat USD xizmatdan (odatda butun zayavka bitta valyuta).
  const dom = xizmatlar.filter((x) => x.currency === 'USD' && x.kurs > 0).sort((a, b) => b.price - a.price)[0];
  return {
    rId: z.id || n,
    nomer: String(n),
    mijoz: z.client,
    manager: z.manager,
    status: z.status,
    xizmatlar,
    sell: z.sell,
    clientPaid: z.clientPaid,
    clientDebt: z.clientDebt,
    currencyId: dom ? 2 : 18,
    kurs: dom ? dom.kurs : 0,
    valyuta: dom ? 'USD' : "so'm",
  };
}

// ===== To'lov yaratish (prixot / rasxod) =====

export interface CreatePaymentInput {
  rId: number;            // zayavka (r_id)
  isPrixot: boolean;      // true=prixot(cio_id 1), false=rasxod(cio_id 2)
  price: number;          // summa (tanlangan valyutada)
  currencyId?: number;
  koef?: number;          // kurs (valyuta → so'm); U-ON: price × koef = so'm
  supplierId?: number;    // partner (bo'lsa type_id=2, aks holda 1)
  cashId?: number;
  formId?: number;
  date?: string;          // YYYY-MM-DD (H:i:s avtomat qo'shiladi)
  reason?: string;        // to'lov asosi / izoh
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<{ ok: true; paymentId?: string } | { ok: false; error: string }> {
  // MUHIM (jonli tasdiqlangan): `type_id` to'lov qaysi TOMONga tushishini belgilaydi.
  //   type_id=1 → "Расчеты с клиентом" (mijoz tomoni, calc_client)
  //   type_id=2 → "Расчеты с партнером" (partnyor tomoni, calc_partner)
  // Avval `type_id: supplierId ? 2 : 1` edi — prixotда partnyor tanlansa mijoz
  // to'lovi partnyor tomonga tushib, hisobotni buzardi. Endi YO'NALISHга bog'liq:
  // prixot=mijoz(1), rasxod=partnyor(2). Partnyor faqat rasxodда yuboriladi.
  const { httpOk, data } = await uonPost('payment/create', {
    r_id: input.rId,
    cio_id: input.isPrixot ? 1 : 2,                    // 1=приход, 2=расход
    type_id: input.isPrixot ? 1 : 2,                   // 1=mijoz (prixot), 2=partnyor (rasxod)
    price: input.price,
    c_id: input.currencyId,                            // valyuta — U-ON doc: `c_id` (currency_id EMAS!)
    currency_id: input.currencyId,                     // ehtiyot uchun (U-ON noto'g'ri nomni e'tiborsiz qoldiradi)
    koef: input.koef,                                  // kurs (valyuta → so'm)
    supplier_id: input.isPrixot ? undefined : input.supplierId, // partnyor faqat rasxodда
    cash_id: input.cashId,
    form_id: input.formId,
    date: input.date ? `${input.date} 12:00:00` : undefined,
    reason: input.reason,
  });
  if (!isOk(httpOk, data)) return { ok: false, error: uonXatoUz(errText(data)) };
  const d = (data && typeof data === 'object' ? (data as Record<string, unknown>) : {}) as Record<string, unknown>;
  const rawId = d.id ?? d.payment_id ?? (d.result && typeof d.result === 'object' ? (d.result as Record<string, unknown>).id : undefined);
  return { ok: true, paymentId: rawId !== undefined ? String(rawId) : undefined };
}

// To'lovni o'chirish (xato kiritilganda / tahrirlashda eski to'lovni almashtirish).
// JONLI TASDIQLANGAN (2026-07): `payment/delete/{id}` faqat POST bilan ishlaydi.
// GET → 404 "Method not allowed (see GET/POST)". POST (bo'sh tana) → {result:200}.
export async function deletePayment(paymentId: string | number): Promise<{ ok: true } | { ok: false; error: string }> {
  const { httpOk, data } = await uonPost(`payment/delete/${paymentId}`, {});
  if (isOk(httpOk, data)) return { ok: true };
  const raw = errText(data);
  // IDEMPOTENT: to'lov allaqachon yo'q bo'lsa — o'chirish maqsadi bajarilgan, muvaffaqiyat.
  // Aks holda mahalliy yozuv abadiy qamalib qolardi (11004 "not found" holati).
  if (tolovYoq(raw)) return { ok: true };
  return { ok: false, error: uonXatoUz(raw) };
}

// ===== Zayavkalar ro'yxati (hisobotlar uchun) =====
// U-ON'da bitta ro'yxat endpointi yo'q — `POST request/search` ishlatiladi
// (wrapper: `requests`, 100 ta/sahifa, `page` bilan sahifalanadi). `date_begin_from`
// (Y-m-d) xizmat sanasi bo'yicha filtr — kelajakdagi zayavkalar ham qaytadi.
// Har zayavka ichida moliyaviy calc maydonlari bor (payments'ni ochish shart emas).

// Vergul/probel/bo'sh qiymatlarni himoyalab songa aylantiradi.
function num(x: unknown): number {
  const n = Number(String(x ?? '').replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function mapZayavka(r: Record<string, unknown>): HisobotZayavka {
  const dstr = (v: unknown) => String(v ?? '').slice(0, 10); // "Y-m-d H:i" -> "Y-m-d"
  const name = (...parts: unknown[]) =>
    parts.map((x) => String(x ?? '').trim()).filter(Boolean).join(' ');
  const sell = num(r.calc_price);
  const clientPaid = num(r.calc_client);
  const netto = num(r.calc_price_netto);
  const partnerPaid = Math.abs(num(r.calc_partner));
  return {
    id: Number(r.id) || 0,
    dateBegin: dstr(r.date_begin),
    dateEnd: dstr(r.date_end),
    dateCreated: dstr(r.dat ?? r.created_at ?? r.dat_request),
    client: name(r.client_surname, r.client_name) || String(r.client_company ?? '') || '—',
    manager: name(r.manager_surname, r.manager_name),
    supplierId: Number(r.supplier_id) || 0,
    supplierName: String(r.supplier_name ?? '') || '',
    status: String(r.status ?? ''),
    statusId: Number(r.status_id) || 0,
    payStatus: String(r.status_pay_name ?? ''),
    payStatusId: Number(r.status_pay_id) || 0,
    sell,
    clientPaid,
    clientDebt: sell - clientPaid,
    netto,
    partnerPaid,
    partnerDebt: netto - partnerPaid,
  };
}

// Xizmat sanasi `sinceDate`(Y-m-d)dan boshlab (kelajak ham) barcha zayavkalar.
// Sahifalar PARALLEL o'qiladi (har javob katta — ketma-ket sekin). U-ON limiti
// 10 so'rov/sek — shuning uchun bir vaqtda 5 sahifadan. Sahifa <100 qaytsa — oxiri.
export async function listZayavki(sinceDate: string): Promise<HisobotZayavka[]> {
  const PER = 100, BATCH = 5, MAX_PAGE = 40; // 40*100=4000 — amaliy backstop
  const all: Record<string, unknown>[] = [];
  for (let start = 1; start <= MAX_PAGE; start += BATCH) {
    const pages = Array.from({ length: BATCH }, (_, i) => start + i);
    const results = await Promise.all(
      pages.map((p) => uonPost('request/search', { date_begin_from: sinceDate, page: p })),
    );
    let got = 0;
    for (const { httpOk, data } of results) {
      if (!httpOk) continue;
      const rows = firstArray(data); // wrapper: `requests`
      all.push(...rows);
      got += rows.length;
    }
    if (got < BATCH * PER) break; // to'liq bo'lmagan partiya = oxiriga yetdik
  }
  return all.map(mapZayavka);
}

// ===== Prixot to'lovlari (KPI uchun) =====
// Har zayavka ichida `payments` massivi keladi (cio_id 1=prixot/приход, 2=rasxod).
// KPI = tushgan pul bo'yicha, pul tushgan oyga yoziladi — shuning uchun har prixot
// to'lovi (cio_id=1) alohida yozuv: menejer + oy + so'm qiymati. So'm = price × rate
// (USD to'lov kursga ko'paytiriladi; som bo'lsa price o'zi).

export interface PrixotTolov {
  rId: number;
  managerId: number;
  managerName: string;
  oy: string;   // YYYY-MM (to'lov sanasi)
  sana: string; // YYYY-MM-DD
  som: number;  // so'mdagi qiymat
}

export async function listPrixotTolovlar(sinceDate: string): Promise<PrixotTolov[]> {
  const PER = 100, BATCH = 5, MAX_PAGE = 40;
  const out: PrixotTolov[] = [];
  for (let start = 1; start <= MAX_PAGE; start += BATCH) {
    const pages = Array.from({ length: BATCH }, (_, i) => start + i);
    const results = await Promise.all(
      pages.map((p) => uonPost('request/search', { date_begin_from: sinceDate, page: p })),
    );
    let got = 0;
    for (const { httpOk, data } of results) {
      if (!httpOk) continue;
      const rows = firstArray(data);
      got += rows.length;
      for (const r of rows) {
        const managerId = Number(r.manager_id) || 0;
        const managerName = [r.manager_surname, r.manager_name].map((x) => String(x ?? '').trim()).filter(Boolean).join(' ');
        const rId = Number(r.id) || 0;
        const pmts = Array.isArray(r.payments) ? (r.payments as Record<string, unknown>[]) : [];
        for (const p of pmts) {
          if (Number(p.cio_id) !== 1) continue; // faqat prixot (приход)
          const sana = String(p.date_create ?? '').slice(0, 10);
          if (!sana) continue;
          const price = num(p.price);
          const rate = num(p.rate) || 1;
          const som = Number(p.currency_id) === 18 ? price : price * rate; // som bo'lmasa kursga
          if (som <= 0) continue;
          out.push({ rId, managerId, managerName, oy: sana.slice(0, 7), sana, som });
        }
      }
    }
    if (got < BATCH * PER) break;
  }
  return out;
}

// Kalit sozlanganmi (sahifada ogohlantirish uchun)
export function hasUonKey(): boolean {
  return !!process.env.UON_API_KEY;
}
