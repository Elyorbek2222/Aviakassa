// Davr (period) yordamchilari — Bugun / oy / Hammasi tanlash uchun.

import { todayStr } from './utils';

export type PeriodKey = string; // 'today' | 'all' | 'YYYY-MM'

export const UZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

// Oxirgi `count` oy uchun {key, label} ro'yxati (yangidan eskiga).
export function monthOptions(count = 12): { key: string; label: string }[] {
  const now = new Date();
  const opts: { key: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`,
      label: `${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return opts;
}

// Period kalitidan {from, to} (YYYY-MM-DD) sanalar oralig'i.
export function periodRange(key: string): { from: string | null; to: string | null } {
  if (key === 'all') return { from: null, to: null };
  if (key === 'today') {
    const t = todayStr();
    return { from: t, to: t };
  }
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const lastDay = new Date(year, month, 0).getDate(); // keyingi oyning 0-kuni = shu oy oxiri
    return { from: `${m[1]}-${m[2]}-01`, to: `${m[1]}-${m[2]}-${pad2(lastDay)}` };
  }
  return { from: null, to: null };
}

export function periodLabel(key: string): string {
  if (key === 'all') return 'Hammasi';
  if (key === 'today') return 'Bugun';
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${UZ_MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  return key;
}

// SWR/API uchun query satri (?from=...&to=...). Bo'sh oralq -> '' (hammasi).
export function periodQuery(key: string): string {
  const { from, to } = periodRange(key);
  const p = new URLSearchParams();
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  const s = p.toString();
  return s ? `?${s}` : '';
}

// Sana oraliqqa tushadimi (client-side filtrlash uchun).
export function inPeriod(sana: string, key: string): boolean {
  const { from, to } = periodRange(key);
  if (from && sana < from) return false;
  if (to && sana > to) return false;
  return true;
}
