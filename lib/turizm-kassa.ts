// Turizm ichki kassa — sof hisoblash (I/O yo'q). Ostatka route va kassa POST
// guard'i bir xil mantiqni ishlatishi uchun ajratilgan.

import type { TurizmYozuv, TurizmKassaYozuv, TurizmHisob } from '@/types/avia';

export const TURIZM_HISOBLAR: TurizmHisob[] = ['uzs_naxt', 'uzs_plastik', 'usd_naxt', 'usd_plastik'];

export const hisobValyuta = (h: TurizmHisob): 'uzs' | 'usd' => (h.startsWith('usd') ? 'usd' : 'uzs');
export const hisobNaxtmi = (h: TurizmHisob): boolean => h.endsWith('naxt');

// Prixot/rasxod yozuvi qaysi xolatga tegishli — valyuta + to'lov shaklidan.
// currencyId: 18=so'm, 2=USD (U-ON). To'lov shakli: Наличный(1) yoki Наличная
// касса(cash 1) → naxt; aks holda plastik. Ikkisi ham bo'sh bo'lsa — naxt (default).
export function turizmAccount(
  y: Pick<TurizmYozuv, 'valyuta' | 'currencyId' | 'formId' | 'cashId'>,
): TurizmHisob {
  const usd = y.currencyId === 2 || (!!y.valyuta && /usd|доллар|dollar|сша/i.test(y.valyuta));
  const cur = usd ? 'usd' : 'uzs';
  const naxt = y.formId === 1 || (y.formId == null && (y.cashId === 1 || y.cashId == null));
  return `${cur}_${naxt ? 'naxt' : 'plastik'}` as TurizmHisob;
}

export interface Posting { hisob: TurizmHisob; sana: string; delta: number }

// Barcha manbalardan (prixot/rasxod + ichki jurnal) xolat harakatlari.
export function turizmPostings(yozuvlar: TurizmYozuv[], kassa: TurizmKassaYozuv[]): Posting[] {
  const out: Posting[] = [];
  for (const y of yozuvlar) {
    out.push({ hisob: turizmAccount(y), sana: y.sana, delta: y.tur === 'prixot' ? y.summa : -y.summa });
  }
  for (const k of kassa) {
    const toAmt = k.toSumma ?? k.summa;
    if (k.tur === 'boshlangich') {
      if (k.to) out.push({ hisob: k.to, sana: k.sana, delta: k.summa });
    } else {
      if (k.from) out.push({ hisob: k.from, sana: k.sana, delta: -k.summa });
      if (k.to) out.push({ hisob: k.to, sana: k.sana, delta: toAmt });
    }
  }
  return out;
}

export interface HisobBalans { kunBoshi: number; kirim: number; chiqim: number; kunOxiri: number }

// Har xolat uchun kun boshi (from'dan oldin) → kun oxiri (to'gacha), oraliqdagi
// kirim/chiqim. from/to — YYYY-MM-DD (ixtiyoriy). kunOxiri = kunBoshi + kirim − chiqim.
export function turizmBalanslar(postings: Posting[], from?: string, to?: string): Record<TurizmHisob, HisobBalans> {
  const res = {} as Record<TurizmHisob, HisobBalans>;
  for (const h of TURIZM_HISOBLAR) res[h] = { kunBoshi: 0, kirim: 0, chiqim: 0, kunOxiri: 0 };
  for (const p of postings) {
    const b = res[p.hisob];
    if (!b) continue;
    if (from && p.sana < from) b.kunBoshi += p.delta;
    if ((!from || p.sana >= from) && (!to || p.sana <= to)) {
      if (p.delta >= 0) b.kirim += p.delta; else b.chiqim += -p.delta;
    }
    if (!to || p.sana <= to) b.kunOxiri += p.delta;
  }
  return res;
}

// Bitta xolatning joriy (butun davr) qoldig'i — POST guard uchun.
export function turizmQoldiq(postings: Posting[], hisob: TurizmHisob): number {
  return postings.reduce((s, p) => s + (p.hisob === hisob ? p.delta : 0), 0);
}
