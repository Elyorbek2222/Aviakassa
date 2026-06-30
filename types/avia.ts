// ===== Airline Types =====

export type AirlineKey = 'uzairways' | 'silk_avia' | 'centrum' | 'don_avia' | 'easybooking' | 'boshqa';

export const AIRLINE_LABELS: Record<AirlineKey, string> = {
  uzairways: "UZAIRWAYS",
  silk_avia: 'Silk Avia',
  centrum: 'Centrum',
  don_avia: 'Don Avia',
  easybooking: 'Easybooking',
  boshqa: 'Boshqa',
};

// ===== Ticket =====

export interface AviaTicket {
  id: string;
  sana: string; // YYYY-MM-DD
  airline: AirlineKey;
  airlineName: string;
  biletRaqam: string;
  yolovchi: string;
  passengerCount: number;
  tarif: number; // UZS — prixod narx
  sotishNarxi: number; // UZS — sotish narx
  izoh?: string; // Kommentariya
  agent: string;
}

// ===== Payment =====

export type Valyuta = 'uzs' | 'usd';

export type PaymentType = 'naqd' | 'plastik' | 'perechisleniya';

export interface AviaPayment {
  id: string;
  sana: string; // YYYY-MM-DD
  biletRaqam: string;
  mijozIsmi: string;
  valyuta: Valyuta;
  summAsl?: number; // USD amount (only when valyuta === 'usd')
  kurs?: number; // exchange rate (only when valyuta === 'usd')
  summa: number; // UZS — always in UZS
  tolovTuri: PaymentType;
  izoh?: string;
}

// ===== Inkassatsiya =====

export type InkassatsiyaTuri = 'aviakompaniya' | 'kassa';

export interface Inkassatsiya {
  id: string;
  sana: string; // YYYY-MM-DD
  airline: AirlineKey;
  airlineName: string;
  summa: number; // UZS
  izoh?: string;
  turi?: InkassatsiyaTuri; // 'aviakompaniya' (default) yoki 'kassa' (kunlik kassa topshirish)
}

// ===== Rasxod (Kassir chiqimlari) =====

export interface Rasxod {
  id: string;
  sana: string;
  summa: number; // UZS
  sabab: string; // nima uchun chiqim
}

// ===== Refund (Bilet puli qaytarish) =====

export interface Refund {
  id: string;
  sana: string;
  biletRaqam: string;
  mijozIsmi: string;
  summa: number; // UZS
  izoh?: string;
}

// ===== Obmen (kassadagi USD ni som ga o'tkazish) =====
// USD kassadan chiqadi (usdSumma), UZS kassaga kiradi (uzsSumma = usdSumma * kurs).

export interface Obmen {
  id: string;
  sana: string; // YYYY-MM-DD
  usdSumma: number; // o'tkazilgan dollar
  kurs: number;
  uzsSumma: number; // qo'lga kiritilgan so'm
  izoh?: string;
}

// ===== Settings =====

export interface AirlineConfig {
  key: AirlineKey;
  name: string;
  komissiya: number; // % commission
  active: boolean;
}

export interface AviaSettings {
  airlines: AirlineConfig[];
}

// ===== Debt =====

export interface DebtRecord {
  biletRaqam: string;
  mijozIsmi: string;
  sotishNarxi: number;
  tolangan: number;
  qarz: number;
  sana: string;
  airline: AirlineKey;
  biletId: string;
}

export interface PartnerDebt {
  airline: AirlineKey;
  biletlarSumma: number;
  inkassatsiya: number;
  qarz: number;
  biletlar: number;
}

// ===== KPI & Stats =====

export interface AviaKPI {
  jamiBiletlar: number;
  bugunBiletlar: number;
  jamiSotuv: number;
  stok: number; // prixod (payments) - inkassatsiya
  jamiQarzdorlik: number; // partner debt
  sofFoyda: number;
  naqd: number;
  plastik: number;
  perechisleniya: number;
  settledCount: number; // to'liq to'langan biletlar soni (qarz <= 0)
}

export interface AviaSalesPoint {
  date: string;
  sotuv: number;
  biletlar: number;
}

export interface AirlineStat {
  airline: AirlineKey;
  biletlar: number;
  sotuv: number;
  foyda: number;
}

export interface AgentStat {
  agent: string;
  biletlar: number;
  sotuv: number;
  foyda: number;
}

// ===== Oylik sverka (otchot) — aviakassir ledger ↔ aviakompaniya hisobotlari =====

export type SverkaHolat = 'matched' | 'only_beg' | 'no_ticket' | 'kiritilmagan';
export type SverkaFarqTuri = '' | 'ok' | 'marja' | 'reissue' | 'farq';

export interface SverkaRow {
  id: string;
  manba: 'begzod' | 'manba_only';
  sana: string;
  biletRaqam: string;
  familiya: string;
  ism: string;
  nomi: string;
  begzodJami: number | null;
  kontragent: string;
  manbaJami: number | null;
  farq: number | null;
  holat: SverkaHolat;
  farqTuri: SverkaFarqTuri;
  nomMos: boolean | null;
}

export interface SverkaStats {
  begCount: number;
  srcCount: number;
  match: number;
  onlyBeg: number;
  noTicket: number;
  farq: number;
  reissue: number;
  nameBad: number;
  srcOnly: number;
  begSum: number;
  srcSum: number;
}

export interface SverkaData {
  meta: { oy: string; manbalar: string[]; sverka: SverkaStats };
  yozuvlar: SverkaRow[];
}

// Otchot ro'yxati uchun yengil element (oylar bo'yicha)
export interface OtchotListItem {
  id: string;
  oy: string;
  manbalar: string[];
  sverka: SverkaStats;
}
