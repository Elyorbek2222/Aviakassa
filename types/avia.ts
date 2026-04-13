// ===== Airline Types =====

export type AirlineKey = 'ozhyo' | 'silk_avia' | 'centrum' | 'don_avia' | 'easybooking' | 'boshqa';

export const AIRLINE_LABELS: Record<AirlineKey, string> = {
  ozhyo: "O'zbekiston Havo Yo'llari",
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

export interface Inkassatsiya {
  id: string;
  sana: string; // YYYY-MM-DD
  airline: AirlineKey;
  airlineName: string;
  summa: number; // UZS
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
