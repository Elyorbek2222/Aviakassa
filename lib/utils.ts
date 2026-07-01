import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Bugungi sana (YYYY-MM-DD) Asia/Tashkent (UTC+5, DST yo'q) bo'yicha.
 *
 * `new Date().toISOString()` UTC beradi — server Vercel'da UTC bo'lgani uchun
 * mahalliy vaqt 00:00–05:00 orasida yaratilgan yozuvlar KECHAGI sana bilan
 * yozilib, kunlik kassa ostatkasini buzardi. Shuning uchun sana Tashkent
 * mintaqasida hisoblanadi. `en-CA` locale ISO ko'rinishini (YYYY-MM-DD) beradi.
 */
export function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
}

/**
 * Format money — TO'LIQ (aniq) summa, bo'shliq bilan ajratilgan: "5 000 000".
 * (Ilgari qisqartirilgan "5.0 mln" edi — endi aniq raqam ko'rsatiladi.)
 * Valyuta qo'shimchasi yo'q — chaqiruvchi kerak bo'lsa " so'm" qo'shadi.
 */
export function formatMoney(n: number): string {
  return Math.round(n).toLocaleString('ru-RU');
}

/**
 * Format full money with locale separators: "1 234 567 so'm"
 */
export function formatFullMoney(n: number): string {
  return n.toLocaleString('uz-UZ') + " so'm";
}

// ===== Bilet tahrirlash oynasi (aviakassir o'z biletini 48 soat ichida o'zgartira oladi) =====

export const TICKET_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 soat

/** Bilet yaratilgan vaqti (ms). id formati: TKT-<ms>-<rand>. Bo'lmasa — sana. */
export function ticketCreatedAtMs(t: { id?: string; sana?: string }): number {
  const m = t.id ? /^[A-Z]+-(\d{10,})-/.exec(t.id) : null;
  if (m) return Number(m[1]);
  if (t.sana) {
    const d = Date.parse(t.sana);
    if (!Number.isNaN(d)) return d;
  }
  return 0;
}

/** Tahrirlashgacha qolgan vaqt (ms). Manfiy bo'lsa — muddat o'tgan. */
export function ticketEditRemainingMs(t: { id?: string; sana?: string }, now: number = Date.now()): number {
  const created = ticketCreatedAtMs(t);
  if (!created) return -1;
  return TICKET_EDIT_WINDOW_MS - (now - created);
}
