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
    const m = d.message ?? d.error ?? d.errors ?? d.text;
    if (typeof m === 'string' && m) return m;
    if (m) return JSON.stringify(m);
  }
  return 'U-ON API xatosi';
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

export async function getCurrencies(): Promise<UonRef[]> {
  const { data } = await uonGet('currency');
  return toRefs(firstArray(data), ['name', 'title', 'code', 'short_name']);
}

export async function getCashboxes(): Promise<UonRef[]> {
  const { data } = await uonGet('cash');
  return toRefs(firstArray(data), ['name', 'title']);
}

export async function getPaymentForms(): Promise<UonRef[]> {
  const { data } = await uonGet('payment_form');
  return toRefs(firstArray(data), ['name', 'title']);
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

// ===== To'lov yaratish (prixot / rasxod) =====

export interface CreatePaymentInput {
  rId: number;            // zayavka (r_id)
  isPrixot: boolean;      // true=prixot(cio_id 1), false=rasxod(cio_id 2)
  price: number;          // summa (tanlangan valyutada)
  currencyId?: number;
  supplierId?: number;    // partner (bo'lsa type_id=2, aks holda 1)
  cashId?: number;
  formId?: number;
  date?: string;          // YYYY-MM-DD (H:i:s avtomat qo'shiladi)
  reason?: string;        // to'lov asosi / izoh
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<{ ok: true; paymentId?: string } | { ok: false; error: string }> {
  const { httpOk, data } = await uonPost('payment/create', {
    r_id: input.rId,
    cio_id: input.isPrixot ? 1 : 2,                    // 1=приход, 2=расход
    type_id: input.supplierId ? 2 : 1,                 // 2=partner bilan, 1=mijoz bilan
    price: input.price,
    currency_id: input.currencyId,
    supplier_id: input.supplierId,
    cash_id: input.cashId,
    form_id: input.formId,
    date: input.date ? `${input.date} 12:00:00` : undefined,
    reason: input.reason,
  });
  if (!isOk(httpOk, data)) return { ok: false, error: errText(data) };
  const d = (data && typeof data === 'object' ? (data as Record<string, unknown>) : {}) as Record<string, unknown>;
  const rawId = d.id ?? d.payment_id ?? (d.result && typeof d.result === 'object' ? (d.result as Record<string, unknown>).id : undefined);
  return { ok: true, paymentId: rawId !== undefined ? String(rawId) : undefined };
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

// Kalit sozlanganmi (sahifada ogohlantirish uchun)
export function hasUonKey(): boolean {
  return !!process.env.UON_API_KEY;
}
