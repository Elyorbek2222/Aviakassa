// Server-side kiritish validatsiyasi (kutubxonasiz, yengil).
//
// Maqsad: API route'lardagi `Number(body.x) || 0` uslubidan voz kechish — xato
// kiritilgan summa jimgina 0 ga aylanmasin, balki aniq 400 xato qaytarilsin.
// Har validator `{ ok, value } | { ok: false, error }` qaytaradi (xato — o'zbekcha).

import type { PaymentType, Valyuta } from '@/types/avia';
import { todayStr } from './utils';

export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; error: string };
export type Result<T> = Ok<T> | Err;

const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
const err = (error: string): Err => ({ ok: false, error });

// ===== Primitivlar =====

// Chekli (finite) son. Bo'sh/NaN/Infinity => null.
export function toNumber(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// Trim qilingan bo'sh bo'lmagan matn, aks holda null.
export function toText(v: unknown): string | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

// YYYY-MM-DD sana. Noto'g'ri format yoki mavjud bo'lmagan sana (masalan 2026-02-31) => null.
export function toDateStr(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10) === s ? s : null; // haqiqiy sana ekanini tasdiqlash
}

const PAYMENT_TYPES: PaymentType[] = ['naqd', 'plastik', 'perechisleniya'];
const VALYUTALAR: Valyuta[] = ['uzs', 'usd'];

// ===== Entity validatorlari =====
// Faqat validatsiya qiladi (koersiya emas); route mos maydonlarni o'zi yig'adi.

export interface TicketInput {
  biletRaqam: string;
  yolovchi: string;
  tarif: number;
  sotishNarxi: number;
  passengerCount: number;
  sana?: string; // sotuv sanasi (ixtiyoriy) — berilmasa route bugungi kunni qo'yadi
  qoshimchaFoyda?: number; // alohida (ekstra) foyda — ixtiyoriy
  qoshimchaIzoh?: string;
}

export function validateTicket(body: Record<string, unknown>): Result<TicketInput> {
  const biletRaqam = toText(body.biletRaqam);
  if (!biletRaqam) return err('Bilet raqami kiritilmagan');

  const yolovchi = toText(body.yolovchi);
  if (!yolovchi) return err("Yo'lovchi ismi kiritilmagan");

  const tarif = toNumber(body.tarif);
  if (tarif === null || tarif < 0) return err("Tarif noto'g'ri (manfiy yoki bo'sh)");

  // Sotish narxi 0 bo'lishi mumkin (bepul / reissue / mil bilet). Bo'sh yoki xato
  // qiymat (null) hamon rad etiladi — summa jimgina 0 ga aylanib qolmasin.
  const sotishNarxi = toNumber(body.sotishNarxi);
  if (sotishNarxi === null || sotishNarxi < 0) return err("Sotish narxi manfiy bo'lishi mumkin emas");

  const rawCount = body.passengerCount;
  const passengerCount = rawCount === undefined || rawCount === null || rawCount === '' ? 1 : toNumber(rawCount);
  if (passengerCount === null || passengerCount < 1) return err("Yo'lovchilar soni kamida 1 bo'lishi kerak");

  // Sotuv sanasi (ixtiyoriy). Orqaga sana qo'yish mumkin (masalan iyun bilet iyulda
  // kiritilsa), lekin kelajakdagi sana rad etiladi — foyda noto'g'ri oyga tushmasin.
  let sana: string | undefined;
  if (body.sana !== undefined && body.sana !== null && body.sana !== '') {
    const d = toDateStr(body.sana);
    if (!d) return err("Sotuv sanasi noto'g'ri (YYYY-MM-DD)");
    if (d > todayStr()) return err("Sotuv sanasi kelajakda bo'la olmaydi");
    sana = d;
  }

  // Qo'shimcha (ekstra) foyda — ixtiyoriy, manfiy bo'lmasin.
  let qoshimchaFoyda: number | undefined;
  if (body.qoshimchaFoyda !== undefined && body.qoshimchaFoyda !== null && body.qoshimchaFoyda !== '') {
    const q = toNumber(body.qoshimchaFoyda);
    if (q === null || q < 0) return err("Qo'shimcha foyda noto'g'ri (manfiy yoki bo'sh)");
    qoshimchaFoyda = q;
  }

  const qoshimchaIzoh = toText(body.qoshimchaIzoh) ?? undefined;

  return ok({ biletRaqam, yolovchi, tarif, sotishNarxi, passengerCount, sana, qoshimchaFoyda, qoshimchaIzoh });
}

export interface PaymentInput {
  valyuta: Valyuta;
  summa: number;
  summAsl?: number;
  kurs?: number;
  tolovTuri: PaymentType;
}

export function validatePayment(body: Record<string, unknown>): Result<PaymentInput> {
  const valyuta = (toText(body.valyuta) || 'uzs') as Valyuta;
  if (!VALYUTALAR.includes(valyuta)) return err("Valyuta noto'g'ri");

  const tolovTuri = (toText(body.tolovTuri) || 'naqd') as PaymentType;
  if (!PAYMENT_TYPES.includes(tolovTuri)) return err("To'lov turi noto'g'ri");

  const summa = toNumber(body.summa);
  if (summa === null || summa <= 0) return err("Summa 0 dan katta bo'lishi kerak");

  if (valyuta === 'usd') {
    const summAsl = toNumber(body.summAsl);
    if (summAsl === null || summAsl <= 0) return err('USD summasi 0 dan katta bo\'lishi kerak');
    const kurs = toNumber(body.kurs);
    if (kurs === null || kurs <= 0) return err("Kurs 0 dan katta bo'lishi kerak");
    return ok({ valyuta, summa, summAsl, kurs, tolovTuri });
  }

  return ok({ valyuta, summa, tolovTuri });
}

// Rasxod / Refund / Inkassatsiya — barchasi musbat summa talab qiladi.
export function validateAmount(v: unknown, label = 'Summa'): Result<number> {
  const n = toNumber(v);
  if (n === null || n <= 0) return err(`${label} 0 dan katta bo'lishi kerak`);
  return ok(n);
}

export interface ObmenInput {
  usdSumma: number;
  kurs: number;
}

export function validateObmen(body: Record<string, unknown>): Result<ObmenInput> {
  const usdSumma = toNumber(body.usdSumma);
  if (usdSumma === null || usdSumma <= 0) return err("USD summasi 0 dan katta bo'lishi kerak");
  const kurs = toNumber(body.kurs);
  if (kurs === null || kurs <= 0) return err("Kurs 0 dan katta bo'lishi kerak");
  return ok({ usdSumma, kurs });
}

// Komissiya foizi 0..100 oralig'ida.
export function validateKomissiya(v: unknown): Result<number> {
  const n = toNumber(v);
  if (n === null || n < 0 || n > 100) return err("Komissiya 0..100 oralig'ida bo'lishi kerak");
  return ok(n);
}
