import type { UserRole } from '@/lib/auth';

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
  qoshimchaFoyda?: number; // Begzod alohida kiritgan qo'shimcha (ekstra) foyda — UZS
  qoshimchaIzoh?: string; // qo'shimcha foyda izohi (ixtiyoriy)
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
  airline?: AirlineKey;  // qaysi aviakompaniya bileti
  airlineName?: string;  // ko'rsatish uchun
  manba?: string;        // bilet qaysi joydan/kimdan olingan (Centrum, to'g'ridan, agent...)
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

// ===== Perevod (bank hisobidan chiqim) =====
// Naqd + plastik + perechisleniya pullar bank hisobiga (schet) yig'iladi. Perevod =
// o'sha bankdan chiqim: aviakompaniyaga to'lov, nalog, ish haqi, boshqa xarajat.
// Aviakompaniyaga perevod o'sha aviakompaniya qarzini (partner debt) kamaytiradi.

export type PerevodTur = 'aviakompaniya' | 'nalog' | 'ish_haqi' | 'boshqa';

export const PEREVOD_TUR_LABEL: Record<PerevodTur, string> = {
  aviakompaniya: 'Aviakompaniya',
  nalog: 'Nalog / soliq',
  ish_haqi: 'Ish haqi',
  boshqa: 'Boshqa xarajat',
};

export interface Perevod {
  id: string;
  sana: string; // YYYY-MM-DD
  tur: PerevodTur;
  summa: number; // UZS
  airline?: AirlineKey; // faqat tur === 'aviakompaniya'
  airlineName?: string; // ko'rsatish uchun
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
  izoh?: string; // biletdagi komentariya (kimga yozilgani) — qarzdorni topish uchun
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
  stok: number; // NAQD kassa (Excel OSTATOK) = naqd + obmen(so'm) − inkassatsiya − rasxod (refund KIRMAYDI)
  usdKassa: number; // USD kassa = USD to'lovlar − obmen(USD)
  bankUzs: number; // Plastik + perechisleniya (bank kirim) — naqd kassadan tashqarida
  bankBalans: number; // Bank hisobi balansi = plastik+perech + naqddan topshirilgan − perevodlar
  jamiPerevod: number; // bankdan chiqqan perevodlar jami (UZS)
  jamiQarzdorlik: number; // partner debt
  sofFoyda: number;
  qoshimchaFoyda: number; // shundan Begzodning alohida kiritgan ekstra foydasi (UZS)
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

// Oylik xisobot: biletlarga yozilgan summa ↔ kirgan pul, va oradagi farq (qoldiq).
export interface OylikXisobotRow {
  oy: string;         // YYYY-MM
  biletlar: number;   // otchot sverka.begSum — biletlarga yozilgan summa
  pulKirgan: number;  // prixot: bilet + o'tkazma yig'indisi
  farq: number;       // biletlar - pulKirgan (musbat = qoldiq/qarz)
}

// ===== Prixot (biletlar uchun kirgan pul) — kunlik jurnal, admin tahrirlaydi =====
// Aviakompaniya otchoti (bilet narxlari) bilan solishtirish uchun. Nom bo'yicha
// avtomatik moslashtirish ishonchsiz, shuning uchun admin qatorlarni qo'lda tuzatadi.

export type PrixotTur = 'bilet' | 'otkazma' | 'obmen' | 'foyda' | 'tur' | 'boshqa';

export const PRIXOT_TUR_LABEL: Record<PrixotTur, string> = {
  bilet: 'Bilet puli',
  otkazma: "Tur→Avia o'tkazma",
  obmen: 'Obmen (dollar)',
  foyda: 'Foyda',
  tur: 'Tur mahsuloti',
  boshqa: 'Boshqa',
};

// Sverka balansida faqat shular "avia bilet uchun kirgan pul" deb hisoblanadi.
export const PRIXOT_HISOB_TURLARI: PrixotTur[] = ['bilet', 'otkazma'];

export interface PrixotYozuv {
  id: string;
  sana: string; // YYYY-MM-DD
  mijoz: string;
  summa: number; // UZS
  tur: PrixotTur;
  biletRaqam?: string; // ixtiyoriy — admin qo'lda bog'lasa aniq sverka bo'ladi
  izoh?: string;
}

// Bir oylik prixot hujjati (otchot jadvalida `prixot-YYYY-MM` id bilan saqlanadi)
export interface PrixotDoc {
  oy: string; // YYYY-MM
  yozuvlar: PrixotYozuv[];
}

// ===== Turizm (SEM Travel) — U-ON CRM bilan sinxron =====
// Sardor prixot/rasxodni BIR MARTA shu yerda kiritadi. Yozuv avval U-ON'ga
// (payment/create) yuboriladi, muvaffaqiyatli bo'lsagina Supabase'ga (hisobot
// nusxasi sifatida) saqlanadi. U-ON = asosiy manba (strict rejim).

export type TurizmTur = 'prixot' | 'rasxod'; // U-ON cio_id: prixot=1, rasxod=2

export const TURIZM_TUR_LABEL: Record<TurizmTur, string> = {
  prixot: 'Prixot (kirim)',
  rasxod: 'Rasxod (chiqim)',
};

export interface TurizmYozuv {
  id: string; // bizning ID (TUR-...)
  sana: string; // YYYY-MM-DD — to'lov sanasi
  zayavka: string; // Sardor kiritgan U-ON zayavka nomeri (inson-o'qiydigan)
  rId: number; // U-ON ichki request ID (zayavka nomeridan aniqlanadi)
  tur: TurizmTur; // prixot | rasxod
  summa: number; // tanlangan valyutadagi summa
  kurs?: number; // valyuta so'mdan boshqa bo'lsa — kurs (U-ON koef)
  summaUzs?: number; // so'm ekvivalenti (summa × kurs) — chek/hisobot uchun
  mijoz?: string; // zayavka mijozi (chek uchun, lookup'dan)
  xizmat?: string; // zayavka xizmat(lar)i (chek uchun, lookup'dan)
  valyuta?: string; // ko'rsatish uchun valyuta belgisi (masalan 'UZS')
  currencyId?: number; // U-ON currency id
  partnerId?: number; // U-ON supplier_id (asosan rasxod uchun)
  partnerNomi?: string; // ko'rsatish uchun partner nomi
  cashId?: number; // U-ON kassa id
  formId?: number; // U-ON to'lov shakli id
  izoh?: string; // to'lov asosi / izoh
  uonPaymentId?: string; // U-ON'da yaratilgan platyoj id (javobdan)
  yaratdi: string; // kim kiritdi (actor nomi)
}

// Bir oylik turizm hujjati (otchot jadvalida `turizm-YYYY-MM` id bilan saqlanadi)
export interface TurizmDoc {
  oy: string; // YYYY-MM
  yozuvlar: TurizmYozuv[];
}

// ===== Turizm hisobotlari (U-ON zayavkalaridan jonli hisoblanadi) =====
// Manba: U-ON `request/search`. Har zayavkada 4 ta calc maydoni bor:
//   calc_price        = mijoz shartnoma summasi (sotuv)
//   calc_client       = mijoz TO'LAGAN summa (shu paytgacha)
//   calc_price_netto  = partnyor tannarxi (netto)
//   calc_partner (abs)= partnyorga TO'LANGAN summa
// Shundan: mijoz qarzi = sotuv − to'langan; partnyor qarzi = netto − to'langan.
// (U-ON'ning "to'lov holati" belgisi qo'lda qo'yiladi va eskirishi mumkin —
//  shuning uchun qarz summasi calc maydonlaridan hisoblanadi, belgidan emas.)
export interface HisobotZayavka {
  id: number;          // U-ON zayavka nomeri
  dateBegin: string;   // YYYY-MM-DD — xizmat/uchish boshlanish sanasi
  dateEnd: string;     // YYYY-MM-DD
  dateCreated: string; // YYYY-MM-DD — zayavka yaratilgan sana
  client: string;      // mijoz F.I.Sh
  manager: string;     // menejer
  supplierId: number;
  supplierName: string; // partnyor
  status: string;       // zayavka holati (masalan "В работе")
  statusId: number;
  payStatus: string;    // U-ON to'lov holati belgisi (ma'lumot uchun)
  payStatusId: number;  // 1=to'lanmagan, 2=qisman, 3=to'liq
  sell: number;         // calc_price — sotuv summasi (so'm)
  clientPaid: number;   // calc_client — mijoz to'lagan
  clientDebt: number;   // sell − clientPaid (mijoz bizga qarz)
  netto: number;        // calc_price_netto — partnyor tannarxi
  partnerPaid: number;  // |calc_partner| — partnyorga to'langan
  partnerDebt: number;  // netto − partnerPaid (biz partnyorga qarz)
}

export interface TurizmHisobot {
  generatedAt: string; // ISO — qachon yig'ilgan
  today: string;       // YYYY-MM-DD (Asia/Tashkent)
  sinceDate: string;   // YYYY-MM-DD — qamrov boshi (12 oy oldin)
  total: number;       // aktiv zayavkalar soni (Отказ/Аннулирована chiqarilgan)
  kutilayotgan: HisobotZayavka[];  // A) xizmat sanasi hali kelmagan
  otkazilmagan: HisobotZayavka[];  // B) mijoz to'lagan, partnyorga o'tkazilmagan
  mijozQarz: HisobotZayavka[];     // C1) o'tgan sana + mijoz to'liq to'lamagan
  partnyorQarz: HisobotZayavka[];  // C2) partnyorga qarzimiz
  kpi: {
    kutilayotganSoni: number;
    otkazilmaganSoni: number;
    mijozQarzSoni: number;
    mijozQarzSumma: number;
    partnyorQarzSoni: number;
    partnyorQarzSumma: number;
  };
}

// ===== Audit log (kim / nima / qachon) =====

export type AuditAction = 'create' | 'update' | 'delete' | 'clear';

// Auditda kuzatiladigan entity turlari
export type AuditEntity =
  | 'ticket'
  | 'payment'
  | 'rasxod'
  | 'refund'
  | 'obmen'
  | 'inkassatsiya'
  | 'perevod'
  | 'settings'
  | 'otchot'
  | 'prixot'
  | 'turizm';

export interface AuditEntry {
  id: string;
  ts: string; // ISO timestamp
  actorName: string; // sessiyadagi foydalanuvchi nomi
  actorRole: UserRole;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string; // '' — clear/bulk uchun
  summary: string; // qisqa o'zbekcha tavsif (jadvalda ko'rinadi)
  before?: unknown; // update/delete oldingi holat (ixtiyoriy)
  after?: unknown; // create/update yangi holat (ixtiyoriy)
}
