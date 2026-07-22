import { getSupabase } from './supabase';
import type {
  AviaTicket,
  AviaPayment,
  Inkassatsiya,
  Rasxod,
  Refund,
  AviaSettings,
  AirlineConfig,
  SverkaData,
  OtchotListItem,
  OylikXisobotRow,
  Obmen,
  Perevod,
  PrixotDoc,
  PrixotYozuv,
  TurizmDoc,
  TurizmYozuv,
  TurizmKassaYozuv,
  TurizmXodimlar,
} from '../types/avia';
import { PRIXOT_HISOB_TURLARI } from '../types/avia';

// ===== Generic jsonb hujjat yordamchilari =====

async function selectAll<T>(table: string): Promise<T[]> {
  const { data, error } = await getSupabase().from(table).select('doc');
  if (error) throw error;
  return (data || []).map((r: { doc: T }) => r.doc);
}

async function upsertDocs<T extends { id: string }>(table: string, items: T[]): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map((it) => ({ id: it.id, doc: it }));
  const { error } = await getSupabase().from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

async function deleteAll(table: string): Promise<void> {
  const { error } = await getSupabase().from(table).delete().neq('id', '');
  if (error) throw error;
}

// ===== Default Settings =====

export const DEFAULT_SETTINGS: AviaSettings = {
  airlines: [
    { key: 'uzairways', name: "UZAIRWAYS", komissiya: 7, active: true },
    { key: 'silk_avia', name: 'Silk Avia', komissiya: 5, active: true },
    { key: 'centrum', name: 'Centrum', komissiya: 3, active: true },
    { key: 'don_avia', name: 'Don Avia', komissiya: 0, active: true },
    { key: 'easybooking', name: 'Easybooking', komissiya: 0, active: true },
    { key: 'boshqa', name: 'Boshqa', komissiya: 0, active: true },
  ] as AirlineConfig[],
};

// ===== Tickets =====

export async function getTickets(): Promise<AviaTicket[]> {
  return selectAll<AviaTicket>('tickets');
}

export async function addTickets(tickets: AviaTicket[]): Promise<AviaTicket[]> {
  await upsertDocs('tickets', tickets);
  return getTickets();
}

export async function addSingleTicket(ticket: AviaTicket): Promise<AviaTicket[]> {
  return addTickets([ticket]);
}

// Mavjud biletni yangilash (id bo'yicha upsert)
export async function updateTicket(ticket: AviaTicket): Promise<void> {
  await upsertDocs('tickets', [ticket]);
}

export async function clearTickets(): Promise<void> {
  await deleteAll('tickets');
}

// ===== Payments =====

export async function getPayments(): Promise<AviaPayment[]> {
  return selectAll<AviaPayment>('payments');
}

export async function addPayments(payments: AviaPayment[]): Promise<AviaPayment[]> {
  await upsertDocs('payments', payments);
  return getPayments();
}

export async function addSinglePayment(payment: AviaPayment): Promise<AviaPayment[]> {
  return addPayments([payment]);
}

// Mavjud to'lovni (prixod) yangilash — id bo'yicha upsert
export async function updatePayment(payment: AviaPayment): Promise<void> {
  await upsertDocs('payments', [payment]);
}

export async function clearPayments(): Promise<void> {
  await deleteAll('payments');
}

// ===== Inkassatsiya =====

export async function getInkassatsiya(): Promise<Inkassatsiya[]> {
  return selectAll<Inkassatsiya>('inkassatsiya');
}

export async function addInkassatsiya(item: Inkassatsiya): Promise<Inkassatsiya[]> {
  await upsertDocs('inkassatsiya', [item]);
  return getInkassatsiya();
}

// Mavjud inkassatsiyani yangilash — id bo'yicha upsert
export async function updateInkassatsiya(item: Inkassatsiya): Promise<void> {
  await upsertDocs('inkassatsiya', [item]);
}

// ===== Rasxod =====

export async function getRasxodlar(): Promise<Rasxod[]> {
  return selectAll<Rasxod>('rasxod');
}

export async function addRasxod(item: Rasxod): Promise<Rasxod[]> {
  await upsertDocs('rasxod', [item]);
  return getRasxodlar();
}

// Mavjud rasxodni yangilash — id bo'yicha upsert
export async function updateRasxod(item: Rasxod): Promise<void> {
  await upsertDocs('rasxod', [item]);
}

// ===== Obmen (USD -> UZS) =====

export async function getObmenlar(): Promise<Obmen[]> {
  // Jadval hali yaratilmagan bo'lsa ham sahifa buzilmasin
  try {
    return await selectAll<Obmen>('obmen');
  } catch {
    return [];
  }
}

export async function addObmen(item: Obmen): Promise<Obmen[]> {
  await upsertDocs('obmen', [item]);
  return getObmenlar();
}

export async function updateObmen(item: Obmen): Promise<void> {
  await upsertDocs('obmen', [item]);
}

// ===== Refund =====

export async function getRefundlar(): Promise<Refund[]> {
  return selectAll<Refund>('refund');
}

export async function addRefund(item: Refund): Promise<Refund[]> {
  await upsertDocs('refund', [item]);
  return getRefundlar();
}

// Mavjud refundni yangilash — id bo'yicha upsert
export async function updateRefund(item: Refund): Promise<void> {
  await upsertDocs('refund', [item]);
}

// ===== Perevod (bank hisobidan chiqim) =====

export async function getPerevodlar(): Promise<Perevod[]> {
  // Jadval hali yaratilmagan bo'lsa ham sahifa buzilmasin (obmen kabi)
  try {
    return await selectAll<Perevod>('perevod');
  } catch {
    return [];
  }
}

export async function addPerevod(item: Perevod): Promise<Perevod[]> {
  await upsertDocs('perevod', [item]);
  return getPerevodlar();
}

// Mavjud perevodni yangilash — id bo'yicha upsert
export async function updatePerevod(item: Perevod): Promise<void> {
  await upsertDocs('perevod', [item]);
}

// ===== Oylik sverka (otchot) =====

const EMPTY_SVERKA: SverkaData = {
  meta: { oy: '', manbalar: [], sverka: {
    begCount: 0, srcCount: 0, match: 0, onlyBeg: 0, noTicket: 0,
    farq: 0, reissue: 0, nameBad: 0, srcOnly: 0, begSum: 0, srcSum: 0,
  } },
  yozuvlar: [],
};

// Bitta oylik otchotni id bo'yicha o'qish (masalan 'aprel-2026')
export async function getOtchot(id: string): Promise<SverkaData> {
  const { data, error } = await getSupabase().from('otchot').select('doc').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data?.doc as SverkaData) || EMPTY_SVERKA;
}

// Aprel 2026 sverka hisoboti (Begzod ledger ↔ aviakompaniya manbalari)
export async function getAprelSverka(): Promise<SverkaData> {
  return getOtchot('aprel-2026');
}

// Barcha oylik otchotlar ro'yxati (yengil — yon menyu/index uchun)
export async function listOtchotlar(): Promise<OtchotListItem[]> {
  const { data, error } = await getSupabase().from('otchot').select('id, doc');
  if (error) throw error;
  return (data || [])
    // prixot-* / turizm-* / TKS-* / oylik-* hujjatlar shu jadvalda saqlanadi, lekin otchot emas — chiqarib tashlaymiz
    .filter((r: { id: string }) => !r.id.startsWith('prixot-') && !r.id.startsWith('turizm-') && !r.id.startsWith('TKS-') && !r.id.startsWith('oylik-'))
    .map((r: { id: string; doc: SverkaData }) => ({
      id: r.id,
      oy: r.doc?.meta?.oy || r.id,
      manbalar: r.doc?.meta?.manbalar || [],
      sverka: r.doc?.meta?.sverka || EMPTY_SVERKA.meta.sverka,
    }))
    .sort((a, b) => (a.oy < b.oy ? 1 : -1));
}

// Oylik xisobot: biletlarga yozilgan summa (otchot) ↔ kirgan pul (prixot), oy bo'yicha.
// Bitta o'qishda ikkala hujjat turini birlashtiradi (otchot jadvalida yonma-yon yashaydi).
export async function listOylikXisobot(): Promise<OylikXisobotRow[]> {
  const { data, error } = await getSupabase().from('otchot').select('id, doc');
  if (error) throw error;
  const map = new Map<string, { biletlar: number; pulKirgan: number }>();
  const bucket = (oy: string) => {
    let m = map.get(oy);
    if (!m) { m = { biletlar: 0, pulKirgan: 0 }; map.set(oy, m); }
    return m;
  };
  for (const r of (data || []) as { id: string; doc: SverkaData & PrixotDoc }[]) {
    if (r.id.startsWith('prixot-')) {
      const oy = r.id.slice('prixot-'.length);
      const yoz = (r.doc?.yozuvlar || []) as PrixotYozuv[];
      bucket(oy).pulKirgan += yoz.reduce(
        (s, y) => s + (PRIXOT_HISOB_TURLARI.includes(y.tur) ? (y.summa || 0) : 0), 0);
    } else if (!r.id.startsWith('turizm-') && !r.id.startsWith('TKS-') && !r.id.startsWith('oylik-')) {
      const oy = r.doc?.meta?.oy || r.id;
      bucket(oy).biletlar += r.doc?.meta?.sverka?.begSum || 0;
    }
  }
  return Array.from(map.entries())
    .map(([oy, v]) => ({ oy, biletlar: v.biletlar, pulKirgan: v.pulKirgan, farq: v.biletlar - v.pulKirgan }))
    .sort((a, b) => (a.oy < b.oy ? 1 : -1));
}

export async function saveOtchot(id: string, d: SverkaData): Promise<void> {
  const { error } = await getSupabase().from('otchot').upsert({ id, doc: d }, { onConflict: 'id' });
  if (error) throw error;
}

export async function saveAprelSverka(d: SverkaData): Promise<void> {
  return saveOtchot('aprel-2026', d);
}

// ===== Prixot (biletlar uchun kirgan pul) =====
// Bir oy = bitta hujjat (otchot jadvalida `prixot-YYYY-MM` id bilan). Tahrirlash
// kam sonli qatorlarda va bitta admin tomonidan bo'lgani uchun har o'zgarishda
// butun hujjat qayta yoziladi.
// ponytail: bitta jsonb hujjat; qatorlar minglab bo'lsa alohida jadvalga o'tkaziladi.

export async function getPrixotDoc(oy: string): Promise<PrixotDoc> {
  const { data, error } = await getSupabase().from('otchot').select('doc').eq('id', `prixot-${oy}`).maybeSingle();
  if (error) throw error;
  return (data?.doc as PrixotDoc) || { oy, yozuvlar: [] };
}

export async function savePrixotDoc(d: PrixotDoc): Promise<void> {
  const { error } = await getSupabase().from('otchot').upsert({ id: `prixot-${d.oy}`, doc: d }, { onConflict: 'id' });
  if (error) throw error;
}

// Mavjud prixot oylari (eng yangisi birinchi)
export async function listPrixotOylar(): Promise<string[]> {
  const { data, error } = await getSupabase().from('otchot').select('id');
  if (error) throw error;
  return (data || [])
    .map((r: { id: string }) => r.id)
    .filter((id: string) => id.startsWith('prixot-'))
    .map((id: string) => id.slice('prixot-'.length))
    .sort((a: string, b: string) => (a < b ? 1 : -1));
}

// ===== Turizm (SEM Travel, U-ON) — prixot bilan bir xil naqsh =====
// Bir oy = bitta hujjat (otchot jadvalida `turizm-YYYY-MM` id bilan). Supabase =
// hisobot nusxasi; asosiy manba U-ON.

export async function getTurizmDoc(oy: string): Promise<TurizmDoc> {
  const { data, error } = await getSupabase().from('otchot').select('doc').eq('id', `turizm-${oy}`).maybeSingle();
  if (error) throw error;
  return (data?.doc as TurizmDoc) || { oy, yozuvlar: [] };
}

export async function saveTurizmDoc(d: TurizmDoc): Promise<void> {
  const { error } = await getSupabase().from('otchot').upsert({ id: `turizm-${d.oy}`, doc: d }, { onConflict: 'id' });
  if (error) throw error;
}

// Mavjud turizm oylari (eng yangisi birinchi)
export async function listTurizmOylar(): Promise<string[]> {
  const { data, error } = await getSupabase().from('otchot').select('id');
  if (error) throw error;
  return (data || [])
    .map((r: { id: string }) => r.id)
    .filter((id: string) => id.startsWith('turizm-'))
    .map((id: string) => id.slice('turizm-'.length))
    .sort((a: string, b: string) => (a < b ? 1 : -1));
}

// Barcha oylardagi turizm yozuvlari (prixot/rasxod) — ostatka hisoblash uchun.
// Bitta o'qishda barcha turizm-* hujjatlarini yig'adi.
export async function getAllTurizmYozuvlar(): Promise<TurizmYozuv[]> {
  const { data, error } = await getSupabase().from('otchot').select('id, doc');
  if (error) throw error;
  const out: TurizmYozuv[] = [];
  for (const r of (data || []) as { id: string; doc: TurizmDoc }[]) {
    if (r.id.startsWith('turizm-')) out.push(...(r.doc?.yozuvlar || []));
  }
  return out;
}

// ===== Turizm ichki kassa jurnali (perevod/obmen/inkassatsiya/oylik/boshlangich) =====
// Row-per-event. Alohida jadval yaratish uchun DDL huquqi yo'q (REST service_role
// faqat CRUD) — shuning uchun prixot-*/turizm-* kabi shared `otchot` jadvalida,
// `TKS-` prefiksli id bilan yashaydi. listOtchotlar/listOylikXisobot va otchot
// route bu prefiksni chiqarib tashlaydi.

export async function getTurizmKassa(): Promise<TurizmKassaYozuv[]> {
  const { data, error } = await getSupabase().from('otchot').select('id, doc').like('id', 'TKS-%');
  if (error) throw error;
  return (data || []).map((r: { doc: TurizmKassaYozuv }) => r.doc);
}

export async function addTurizmKassa(item: TurizmKassaYozuv): Promise<TurizmKassaYozuv[]> {
  const { error } = await getSupabase().from('otchot').upsert({ id: item.id, doc: item }, { onConflict: 'id' });
  if (error) throw error;
  return getTurizmKassa();
}

export async function updateTurizmKassa(item: TurizmKassaYozuv): Promise<void> {
  const { error } = await getSupabase().from('otchot').upsert({ id: item.id, doc: item }, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteTurizmKassa(id: string): Promise<void> {
  const { error } = await getSupabase().from('otchot').delete().eq('id', id);
  if (error) throw error;
}

// ===== Turizm xodimlar ro'yxati (fin otdel / oylik) — otchot `oylik-xodimlar` =====

export async function getTurizmXodimlar(): Promise<TurizmXodimlar> {
  const { data, error } = await getSupabase().from('otchot').select('doc').eq('id', 'oylik-xodimlar').maybeSingle();
  if (error) throw error;
  return (data?.doc as TurizmXodimlar) || { xodimlar: [] };
}

export async function saveTurizmXodimlar(d: TurizmXodimlar): Promise<void> {
  const { error } = await getSupabase().from('otchot').upsert({ id: 'oylik-xodimlar', doc: d }, { onConflict: 'id' });
  if (error) throw error;
}

// Ulush (участие) — zayavka bo'yicha menejer ulushi %. U-ON'da bu maydon yo'q,
// qo'lда kiritiladi (default 100 — saqlanmaydi). otchot `turizm-ulush` da { map }.
export async function getTurizmUlush(): Promise<Record<string, number>> {
  const { data, error } = await getSupabase().from('otchot').select('doc').eq('id', 'turizm-ulush').maybeSingle();
  if (error) throw error;
  return (data?.doc as { map?: Record<string, number> })?.map || {};
}

export async function saveTurizmUlush(map: Record<string, number>): Promise<void> {
  const { error } = await getSupabase().from('otchot').upsert({ id: 'turizm-ulush', doc: { map } }, { onConflict: 'id' });
  if (error) throw error;
}

// ===== Settings =====

export async function getSettings(): Promise<AviaSettings> {
  const { data, error } = await getSupabase().from('settings').select('doc').eq('id', 'default').maybeSingle();
  if (error) throw error;
  return (data?.doc as AviaSettings) || DEFAULT_SETTINGS;
}

export async function updateSettings(settings: AviaSettings): Promise<AviaSettings> {
  const { error } = await getSupabase().from('settings').upsert({ id: 'default', doc: settings }, { onConflict: 'id' });
  if (error) throw error;
  return settings;
}
