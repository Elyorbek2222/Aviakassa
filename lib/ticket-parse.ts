// Bilet matnidan (e-chipta / PDF nusxa) maydonlarni avtomatik ajratib olish.
//
// Maqsad: Aviakassir biletni bitta oynaga "paste" qilsa, yo'lovchi ismi, bilet
// raqami va aviakompaniya avtomatik to'lsin — qo'lda terish shart bo'lmasin.
// Narx odatda e-chiptada bo'lmaydi, shuning uchun ixtiyoriy; odam o'zi kiritadi.
//
// Format-larga bardoshli: label (Passenger / Yo'lovchi / Пассажир ...) qidiriladi,
// qiymat shu qatorda yoki keyingi qatorda bo'lishi mumkin. Bir nechta aviakompaniya
// qo'llab-quvvatlanadi (UZAIRWAYS, Silk Avia, Centrum, Don Avia, Easybooking).

import { AIRLINE_LABELS, type AirlineKey } from '@/types/avia';

export interface ParsedTicket {
  yolovchi?: string;
  biletRaqam?: string;
  airline?: AirlineKey;
  airlineName?: string;
  sotishNarxi?: number;
  izoh?: string;
  found: string[]; // topilgan maydonlar (UI uchun): yolovchi, biletRaqam, airline, narx, izoh
}

// Unvon/qo'shimchalarni tozalash: Mr, Mrs, Ms, Miss, Mstr, Dr, (ADT)/(CHD)/(INF) ...
const TITLES = /\b(mr|mrs|ms|miss|mstr|master|dr|adt|chd|inf|adult|child|infant)\b\.?/gi;

function cleanName(s: string): string {
  return s
    .replace(/\([^)]*\)/g, ' ') // (ADT) kabi qavslar
    .replace(TITLES, ' ')
    .replace(/[|/]/g, ' ')
    .replace(/[^\p{L}\s.'-]/gu, ' ') // faqat harf/oraliq qoldiramiz
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseTicketText(raw: string): ParsedTicket {
  const text = (raw || '').replace(/\r/g, '');
  const found: string[] = [];
  const out: ParsedTicket = { found };

  // ===== Yo'lovchi ismi =====
  // "Passenger / Yo'lovchi: Rakhimov Muzaffar Mr (ADT)"
  const nameMatch = text.match(
    /(?:passenger|yo['’ʻ`]?lovchi|пассажир)[^\n:]*:\s*([^\n]+)/i
  );
  if (nameMatch) {
    const name = cleanName(nameMatch[1]);
    // kamida 2 harfli va bo'sh emas
    if (name.replace(/\s/g, '').length >= 2) {
      out.yolovchi = name;
      found.push('yolovchi');
    }
  }

  // ===== Bilet raqami =====
  // "Ticket number / Chipta raqami: 250 2118677279"
  let ticket: string | undefined;
  const tnLabel = text.match(
    /(?:ticket\s*number|chipta\s*raqami|bilet\s*raqami|номер\s*билета|ticket\s*no)[^\n:]*:\s*([0-9][0-9\s-]{8,20})/i
  );
  if (tnLabel) {
    ticket = tnLabel[1].replace(/\s+/g, ' ').trim();
  } else {
    // Label topilmasa — 13 xonali standart bilet raqami (3 prefiks + 10)
    const generic = text.match(/\b(\d{3}[\s-]?\d{10})\b/);
    if (generic) ticket = generic[1].replace(/\s+/g, ' ').trim();
  }
  if (ticket) {
    out.biletRaqam = ticket;
    found.push('biletRaqam');
  }

  // ===== Aviakompaniya =====
  const upper = text.toUpperCase();
  const airlineDetect: [AirlineKey, RegExp][] = [
    ['uzairways', /UZBEKISTAN\s*AIRWAYS|UZAIRWAYS|UZBEKISTON\s*HAVO|\bHY\s?\d{2,4}\b/],
    ['silk_avia', /SILK\s*AVIA|SILKAVIA/],
    ['centrum', /CENTRUM/],
    ['don_avia', /DON\s*AVIA|DONAVIA/],
    ['easybooking', /EASY\s*BOOKING|EASYBOOKING/],
  ];
  for (const [key, re] of airlineDetect) {
    if (re.test(upper)) {
      out.airline = key;
      out.airlineName = AIRLINE_LABELS[key];
      found.push('airline');
      break;
    }
  }

  // ===== Narx (ixtiyoriy) =====
  // Faqat aniq belgilangan "Total/Jami/Итого/Fare/Narx/Amount" yonidagi sonni olamiz.
  const priceMatch = text.match(
    /(?:total|jami|итого|amount|narx|to['’ʻ`]?lov)[^\n:]*[:\s]\s*(?:UZS|СУМ|SUM|so['’ʻ`]?m)?\s*([\d][\d\s.,]{3,})/i
  );
  if (priceMatch) {
    const num = Number(priceMatch[1].replace(/[^\d]/g, ''));
    if (Number.isFinite(num) && num > 1000) {
      out.sotishNarxi = num;
      found.push('narx');
    }
  }

  // ===== Izoh: bron raqami (PNR) =====
  const bron = text.match(/(?:booking\s*ref|bron\s*raqami|pnr|бронирован)[^\n:]*:\s*([A-Z0-9]{5,7})\b/i);
  if (bron) {
    out.izoh = `PNR ${bron[1].trim().toUpperCase()}`;
    found.push('izoh');
  }

  return out;
}
