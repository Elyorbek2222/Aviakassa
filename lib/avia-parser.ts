import * as XLSX from 'xlsx';
import type { AviaTicket, AviaPayment, AirlineKey, PaymentType, Valyuta } from '../types/avia';
import { AIRLINE_LABELS } from '../types/avia';

// ===== Date Helpers =====

/**
 * Parse various date formats into YYYY-MM-DD string.
 * Handles: Excel serial numbers, DD.MM.YYYY, YYYY-MM-DD
 */
function parseDate(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return new Date().toISOString().split('T')[0];
  }

  // Excel serial number (number)
  if (typeof value === 'number') {
    // Excel date serial: days since 1900-01-01 (with the 1900 leap year bug)
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split('T')[0];
  }

  const str = String(value).trim();

  // DD.MM.YYYY
  const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // YYYY-MM-DD (already correct format)
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try native Date parse as fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

// ===== Ticket Parser =====

/**
 * Parse ticket Excel file.
 * Columns A-M:
 * A: SANA (date)
 * B: UZAIRWAYS narx
 * C: Silk narx
 * D: Centrum narx
 * E: Don narx
 * F: Easy narx
 * G: Boshqa narx
 * H: Boshqa nomi
 * I: Bilet raqam
 * J: Yo'lovchi
 * K: Tarif
 * L: Sotish narxi
 * M: Agent
 *
 * Only one of B-G is filled per row — that determines the airline.
 */
export function parseTicketsExcel(buffer: Buffer): AviaTicket[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 'A', defval: '' });

  const tickets: AviaTicket[] = [];

  // Airline column mapping: column letter → AirlineKey
  const airlineColumns: { col: string; key: AirlineKey }[] = [
    { col: 'B', key: 'uzairways' },
    { col: 'C', key: 'silk_avia' },
    { col: 'D', key: 'centrum' },
    { col: 'E', key: 'don_avia' },
    { col: 'F', key: 'easybooking' },
    { col: 'G', key: 'boshqa' },
  ];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Skip header row(s)
    const sanaRaw = row['A'];
    if (!sanaRaw || String(sanaRaw).toLowerCase().includes('sana')) continue;

    // Detect airline from which column B-G has a value
    let airline: AirlineKey = 'boshqa';
    let tarif = 0;

    for (const { col, key } of airlineColumns) {
      const val = toNumber(row[col]);
      if (val > 0) {
        airline = key;
        tarif = val;
        break;
      }
    }

    // If airline is boshqa and column H has a custom name, use it
    const boshqaNomi = String(row['H'] || '').trim();
    const airlineName = airline === 'boshqa' && boshqaNomi
      ? boshqaNomi
      : AIRLINE_LABELS[airline];

    const biletRaqam = String(row['I'] || '').trim();
    const yolovchi = String(row['J'] || '').trim();
    if (!yolovchi) continue;

    const tarifCol = toNumber(row['K']);
    if (tarifCol > 0) tarif = tarifCol;

    const sotishNarxi = toNumber(row['L']) || tarif;
    const agent = String(row['M'] || '').trim();

    tickets.push({
      id: generateId(),
      sana: parseDate(sanaRaw),
      airline,
      airlineName,
      biletRaqam,
      yolovchi,
      passengerCount: 1,
      tarif,
      sotishNarxi,
      agent,
    });
  }

  return tickets;
}

// ===== Payment Parser =====

/**
 * Parse payment Excel file.
 * Columns A-I:
 * A: SANA (date)
 * B: Mijoz (client name)
 * C: Summa (UZS)
 * D: To'lov turi (naqd / plastik / perechisleniya)
 * E: Bilet raqam
 * F: Valyuta (UZS / USD)
 * G: Dollar summa (agar USD bo'lsa)
 * H: Kurs (agar USD bo'lsa)
 * I: Izoh
 */
export function parsePaymentsExcel(buffer: Buffer): AviaPayment[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 'A', defval: '' });

  const payments: AviaPayment[] = [];

  const PAYMENT_TYPE_MAP: Record<string, PaymentType> = {
    naqd: 'naqd',
    'наличные': 'naqd',
    plastik: 'plastik',
    karta: 'plastik',
    card: 'plastik',
    perechisleniya: 'perechisleniya',
    perechislenie: 'perechisleniya',
    'перечисление': 'perechisleniya',
    bank: 'perechisleniya',
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const sanaRaw = row['A'];
    if (!sanaRaw || String(sanaRaw).toLowerCase().includes('sana')) continue;

    const mijozIsmi = String(row['B'] || '').trim();
    if (!mijozIsmi) continue;

    const summa = toNumber(row['C']);
    if (summa <= 0) continue;

    const tolovRaw = String(row['D'] || 'naqd').trim().toLowerCase();
    const tolovTuri: PaymentType = PAYMENT_TYPE_MAP[tolovRaw] || 'naqd';

    const biletRaqam = String(row['E'] || '').trim();
    const valyutaRaw = String(row['F'] || 'UZS').trim().toLowerCase();
    const valyuta: Valyuta = valyutaRaw === 'usd' ? 'usd' : 'uzs';
    const dollarSumma = toNumber(row['G']);
    const kurs = toNumber(row['H']);
    const izoh = String(row['I'] || '').trim();

    // Agar USD bo'lsa va kurs bor bo'lsa, summa = dollar * kurs
    let finalSumma = summa;
    if (valyuta === 'usd' && dollarSumma > 0 && kurs > 0) {
      finalSumma = dollarSumma * kurs;
    }

    payments.push({
      id: generateId(),
      sana: parseDate(sanaRaw),
      biletRaqam,
      mijozIsmi,
      valyuta,
      summa: finalSumma,
      ...(valyuta === 'usd' ? { summAsl: dollarSumma, kurs } : {}),
      tolovTuri,
      ...(izoh ? { izoh } : {}),
    });
  }

  return payments;
}

// ===== Inkassatsiya Parser =====

import type { Inkassatsiya, AirlineKey as AK2 } from '../types/avia';

const AIRLINE_NAME_MAP: Record<string, AK2> = {
  "o'zbekiston havo yo'llari": 'uzairways',
  "uzairways": 'uzairways',
  "havo yo'llari": 'uzairways',
  "uzbekistan airways": 'uzairways',
  "silk avia": 'silk_avia',
  "silk": 'silk_avia',
  "centrum": 'centrum',
  "don avia": 'don_avia',
  "don": 'don_avia',
  "easybooking": 'easybooking',
  "easy": 'easybooking',
};

/**
 * Parse inkassatsiya Excel file.
 * Columns A-D:
 * A: SANA
 * B: PARTNYYOR (airline nomi)
 * C: SUMMA (UZS)
 * D: IZOH
 */
export function parseInkassatsiyaExcel(buffer: Buffer): Inkassatsiya[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 'A', defval: '' });

  const items: Inkassatsiya[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sanaRaw = row['A'];
    if (!sanaRaw || String(sanaRaw).toLowerCase().includes('sana')) continue;

    const partnyorRaw = String(row['B'] || '').trim();
    if (!partnyorRaw) continue;

    const summa = toNumber(row['C']);
    if (summa <= 0) continue;

    // Match airline name
    const lower = partnyorRaw.toLowerCase();
    const airlineKey: AK2 = AIRLINE_NAME_MAP[lower] || 'boshqa';
    const airlineName = airlineKey !== 'boshqa' ? AIRLINE_LABELS[airlineKey] : partnyorRaw;

    const izoh = String(row['D'] || '').trim();

    items.push({
      id: generateId(),
      sana: parseDate(sanaRaw),
      airline: airlineKey,
      airlineName,
      summa,
      ...(izoh ? { izoh } : {}),
    });
  }

  return items;
}
