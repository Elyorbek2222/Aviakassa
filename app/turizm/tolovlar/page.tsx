'use client';

// Finans otdel — partnyorlarga to'lovlar jadvali (yaqin 15 kunlik, ketma-ketlik bilan).
// Manba: mavjud /api/avia/turizm/hisobot → partnyorQarz (biz partnyorga qarzmiz).
// Har zayavkada dateBegin (uchish/xizmat sanasi) = to'lov muddati: mijoz uchib ketgunga
// qadar partnyorga to'lash kerak. Shu sababli sana bo'yicha guruhlab, kun oralig'ida
// ko'rsatamiz. Muddati o'tganlar (sana o'tgan, hali to'lanmagan) — eng shoshilinch, tepada.
// ponytail: summalar so'mda (calc_price_netto — U-ON baza valyutasi); hisobot bilan bir xil.

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import {
  CalendarClock, RefreshCw, Download, AlertTriangle, Building2, Clock, Wallet, Hourglass,
} from 'lucide-react';
import type { HisobotZayavka, TurizmHisobot } from '@/types/avia';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = (n: number) => Math.round(n || 0).toLocaleString('en-US').replaceAll(',', ' ');

const C = {
  card: '#141F19', line: '#1E2E24', mut: '#8A9A8F', dim: '#4A5C50',
  teal: '#22C7A9', green: '#7CFF4F', red: '#FF4444', orange: '#F5A623', blue: '#2CA5E0',
};
const mono = 'var(--font-geist-mono)';
const TOL = 100_000; // shovqin ostonasi (hisobot bilan bir xil)

const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', color: C.mut, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.line}` };
const td: React.CSSProperties = { padding: '8px 10px', fontSize: 12.5, borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap' };

const HAFTA = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

// 'YYYY-MM-DD' → kun farqi (butun son). from < to bo'lsa musbat.
function diffDays(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`), b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}
// 'YYYY-MM-DD' → "01.08.2025 · Juma"
function sanaLabel(d: string): string {
  const [y, m, day] = d.split('-');
  const wd = HAFTA[new Date(`${d}T00:00:00Z`).getUTCDay()] ?? '';
  return `${day}.${m}.${y}${wd ? ` · ${wd}` : ''}`;
}
// kun qoldi → matn
function qoldiLabel(days: number): string {
  if (days < 0) return `${-days} kun o'tdi`;
  if (days === 0) return 'Bugun';
  if (days === 1) return 'Ertaga';
  return `${days} kundan keyin`;
}
function qoldiColor(days: number): string {
  if (days < 0) return C.red;
  if (days <= 2) return C.orange;
  if (days <= 7) return C.teal;
  return C.blue;
}

// Bir zayavkada mijoz to'lab bo'lgan, biz ushlab turgan (partnyorga o'tkazish kerak) pul.
const actionable = (r: HisobotZayavka) => (r.clientPaid > TOL ? Math.min(r.partnerDebt, r.clientPaid) : 0);

interface Kun { date: string; daysLeft: number; list: HisobotZayavka[]; total: number; held: number }

export default function TurizmTolovlarPage() {
  const { data: auth } = useSWR<{ user?: { role?: string } }>('/api/avia/auth', fetcher, { revalidateOnFocus: false });
  const role = auth?.user?.role;
  const canUse = role === 'admin' || role === 'sardor';

  const { data, error, isLoading, mutate } = useSWR<TurizmHisobot & { error?: string }>(
    '/api/avia/turizm/hisobot', fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const [oraliq, setWindow] = useState(15); // kun oralig'i (default 15)
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try { await mutate(fetcher('/api/avia/turizm/hisobot?refresh=1'), { revalidate: false }); }
    finally { setBusy(false); }
  };

  const today = data?.today ?? '';

  // partnyorQarz'ni sanaga qarab ajratamiz: muddati o'tgan / oynadagi kunlar / sanasiz.
  const { overdue, kunlar, undated, hiddenSoni } = useMemo(() => {
    const rows = data?.partnyorQarz ?? [];
    const overdue: HisobotZayavka[] = [];
    const undated: HisobotZayavka[] = [];
    const byDate = new Map<string, HisobotZayavka[]>();
    let hiddenSoni = 0;
    for (const r of rows) {
      if (!r.dateBegin) { undated.push(r); continue; }
      const d = today ? diffDays(today, r.dateBegin) : 0;
      if (d < 0) { overdue.push(r); continue; }
      if (d > oraliq) { hiddenSoni++; continue; } // oynadan tashqari kelajak — hali shoshilinch emas
      const arr = byDate.get(r.dateBegin); if (arr) arr.push(r); else byDate.set(r.dateBegin, [r]);
    }
    overdue.sort((a, b) => (a.dateBegin < b.dateBegin ? -1 : 1)); // eng eski (eng shoshilinch) tepada
    const kunlar: Kun[] = [...byDate.entries()]
      .map(([date, list]) => ({
        date,
        daysLeft: today ? diffDays(today, date) : 0,
        list: [...list].sort((a, b) => b.partnerDebt - a.partnerDebt),
        total: list.reduce((s, r) => s + r.partnerDebt, 0),
        held: list.reduce((s, r) => s + actionable(r), 0),
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    return { overdue, kunlar, undated, hiddenSoni };
  }, [data, today, oraliq]);

  const overdueSum = overdue.reduce((s, r) => s + r.partnerDebt, 0);
  const windowSum = kunlar.reduce((s, k) => s + k.total, 0);
  const heldSum = overdue.reduce((s, r) => s + actionable(r), 0) + kunlar.reduce((s, k) => s + k.held, 0);
  const windowCount = kunlar.reduce((s, k) => s + k.list.length, 0);

  const exportExcel = () => {
    if (!data) return;
    const flat = (r: HisobotZayavka) => ({
      Sana: r.dateBegin || '—',
      'Kun qoldi': r.dateBegin && today ? diffDays(today, r.dateBegin) : '',
      Partnyor: r.supplierName || '—',
      Zayavka: r.id,
      Mijoz: r.client,
      Netto: r.netto,
      "To'langan": r.partnerPaid,
      QARZ: r.partnerDebt,
      "Mijoz to'lagan": r.clientPaid,
      Holat: r.status,
    });
    const wb = XLSX.utils.book_new();
    const rows = [...overdue, ...kunlar.flatMap((k) => k.list)].map(flat);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "To'lovlar jadvali");
    XLSX.writeFile(wb, `partnyor-tolovlar-${today || 'jadval'}.xlsx`);
  };

  if (auth && !canUse) {
    return <div style={{ color: C.mut, padding: 30 }}>Bu bo‘lim uchun ruxsat yo‘q.</div>;
  }

  return (
    <div>
      {/* Sarlavha */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarClock size={24} style={{ color: C.teal }} /> Partnyorga to‘lovlar jadvali
          </h1>
          <div style={{ color: C.dim, fontSize: 12, marginTop: 5 }}>
            Finans otdel · uchish sanasiga qadar partnyorga to‘lash kerak — ketma-ketlik bilan
            {data?.generatedAt && <> · yangilangan {new Date(data.generatedAt).toLocaleTimeString('ru-RU').slice(0, 5)}</>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 9, border: `1px solid ${C.line}`, backgroundColor: C.card }}>
            <span style={{ color: C.mut, fontSize: 12.5 }}>Oraliq:</span>
            <input type="number" min={1} max={365} value={oraliq}
              onChange={(e) => setWindow(Math.max(1, Number(e.target.value) || 1))}
              style={{ width: 54, backgroundColor: '#0A0F0D', border: `1px solid ${C.line}`, color: '#fff', padding: '5px 8px', borderRadius: 7, fontSize: 13, textAlign: 'right', fontFamily: mono }} />
            <span style={{ color: C.dim, fontSize: 12.5 }}>kun</span>
          </div>
          <button onClick={refresh} disabled={busy}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, border: `1px solid ${C.line}`, backgroundColor: C.card, color: busy ? C.dim : C.mut, fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}>
            <RefreshCw size={15} style={{ animation: busy ? 'spin 1s linear infinite' : undefined }} /> {busy ? 'Yangilanmoqda…' : 'Yangilash'}
          </button>
          <button onClick={exportExcel} disabled={!data}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, border: `1px solid ${C.green}40`, backgroundColor: C.green + '14', color: C.green, fontSize: 13, fontWeight: 600, cursor: data ? 'pointer' : 'default', opacity: data ? 1 : 0.5 }}>
            <Download size={15} /> Excel
          </button>
        </div>
      </div>

      {error || data?.error ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: C.red + '14', border: `1px solid ${C.red}40`, color: C.red, borderRadius: 10, padding: '12px 16px', fontSize: 13 }}>
          <AlertTriangle size={16} /> {data?.error || "U-ON bilan bog'lanib bo'lmadi. Keyinroq urinib ko'ring."}
        </div>
      ) : isLoading || !data ? (
        <div style={{ color: C.mut, padding: 30, textAlign: 'center', backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12 }}>
          Yuklanmoqda… U-ON’dan zayavkalar olinmoqda (bir necha soniya).
        </div>
      ) : (
        <>
          {/* KPI */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Kpi icon={<AlertTriangle size={18} />} label="Muddati o'tgan" value={fmt(overdueSum)} sub={`${overdue.length} ta`} color={C.red} />
            <Kpi icon={<CalendarClock size={18} />} label={`Yaqin ${oraliq} kun`} value={fmt(windowSum)} sub={`${windowCount} ta`} color={C.orange} />
            <Kpi icon={<Building2 size={18} />} label="Jami to'lanadigan" value={fmt(overdueSum + windowSum)} sub="so'm" color={C.teal} />
            <Kpi icon={<Wallet size={18} />} label="Mijoz to'lagan (tayyor)" value={fmt(heldSum)} sub="o'tkazishga tayyor" color={C.green} />
          </div>

          {/* Muddati o'tgan — eng shoshilinch */}
          {overdue.length > 0 && (
            <div style={{ backgroundColor: C.card, border: `1px solid ${C.red}40`, borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: `1px solid ${C.line}`, backgroundColor: C.red + '0E' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.red + '18', border: `1px solid ${C.red}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red, flexShrink: 0 }}><AlertTriangle size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>Muddati o‘tgan to‘lovlar <span style={{ color: C.red, fontSize: 13 }}>· {overdue.length}</span></div>
                  <div style={{ color: C.dim, fontSize: 11.5 }}>Uchish sanasi o‘tgan, partnyorga hali to‘lanmagan — darhol to‘lash kerak</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: C.red, fontSize: 17, fontWeight: 800, fontFamily: mono }}>{fmt(overdueSum)}</div>
                  <div style={{ color: C.dim, fontSize: 10.5 }}>jami, so‘m</div>
                </div>
              </div>
              <div style={{ maxHeight: '44vh', overflow: 'auto' }}>
                <PayTable rows={overdue} today={today} showDate />
              </div>
            </div>
          )}

          {/* Yaqin kunlar — sana bo'yicha guruhlangan, ketma-ket */}
          {kunlar.map((k) => (
            <div key={k.date} style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: `1px solid ${C.line}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: qoldiColor(k.daysLeft) + '18', border: `1px solid ${qoldiColor(k.daysLeft)}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: qoldiColor(k.daysLeft), flexShrink: 0 }}><Clock size={17} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 14.5, fontWeight: 700, fontFamily: mono }}>{sanaLabel(k.date)}</div>
                  <div style={{ color: qoldiColor(k.daysLeft), fontSize: 11.5, fontWeight: 600 }}>
                    {qoldiLabel(k.daysLeft)} <span style={{ color: C.dim, fontWeight: 400 }}>· {k.list.length} ta to‘lov</span>
                  </div>
                </div>
                {k.held > TOL && (
                  <div style={{ textAlign: 'right', marginRight: 4 }}>
                    <div style={{ color: C.green, fontSize: 12.5, fontWeight: 700, fontFamily: mono }}>▲ {fmt(k.held)}</div>
                    <div style={{ color: C.dim, fontSize: 10 }}>tayyor</div>
                  </div>
                )}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: C.teal, fontSize: 16, fontWeight: 800, fontFamily: mono }}>{fmt(k.total)}</div>
                  <div style={{ color: C.dim, fontSize: 10.5 }}>shu kunga, so‘m</div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <PayTable rows={k.list} today={today} />
              </div>
            </div>
          ))}

          {kunlar.length === 0 && overdue.length === 0 && (
            <div style={{ color: C.dim, padding: 30, textAlign: 'center', backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, marginBottom: 14 }}>
              Yaqin {oraliq} kun ichida partnyorga to‘lov yo‘q.
            </div>
          )}

          {/* Sanasiz / oynadan tashqari — yo'qotmaslik uchun eslatma */}
          {(undated.length > 0 || hiddenSoni > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.dim, fontSize: 12, backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 14px' }}>
              <Hourglass size={14} />
              {hiddenSoni > 0 && <span>{hiddenSoni} ta to‘lov {oraliq} kundan uzoqroqda. </span>}
              {undated.length > 0 && <span>{undated.length} ta qarzda sana yo‘q. </span>}
              <span>To‘liq ro‘yxat — Turizm hisobotida.</span>
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// Bitta to'lovlar jadvali (muddati o'tgan / kun ichida bir xil ustunlar).
function PayTable({ rows, today, showDate }: { rows: HisobotZayavka[]; today: string; showDate?: boolean }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
      <thead>
        <tr>
          <th style={th}>Partnyor</th>
          {showDate && <th style={th}>Sana</th>}
          {showDate && <th style={{ ...th, textAlign: 'right' }}>Kun</th>}
          <th style={th}>Zayavka</th>
          <th style={th}>Mijoz</th>
          <th style={{ ...th, textAlign: 'right' }}>Netto</th>
          <th style={{ ...th, textAlign: 'right' }}>To‘langan</th>
          <th style={{ ...th, textAlign: 'right' }}>QARZ</th>
          <th style={{ ...th, textAlign: 'right' }}>Mijoz to‘lagan</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const d = r.dateBegin && today ? diffDays(today, r.dateBegin) : 0;
          const held = actionable(r) > TOL;
          return (
            <tr key={r.id}>
              <td style={{ ...td, color: '#fff', fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.supplierName || '—'}</td>
              {showDate && <td style={{ ...td, fontFamily: mono, color: C.mut }}>{r.dateBegin || '—'}</td>}
              {showDate && <td style={{ ...td, textAlign: 'right', fontFamily: mono, color: qoldiColor(d) }}>{d < 0 ? d : `+${d}`}</td>}
              <td style={{ ...td, fontFamily: mono, color: C.mut }}>{r.id}</td>
              <td style={{ ...td, color: C.mut, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.client}</td>
              <td style={{ ...td, textAlign: 'right', fontFamily: mono, color: '#e6f0ea' }}>{fmt(r.netto)}</td>
              <td style={{ ...td, textAlign: 'right', fontFamily: mono, color: C.green }}>{fmt(r.partnerPaid)}</td>
              <td style={{ ...td, textAlign: 'right' }}><b style={{ fontFamily: mono, color: C.teal }}>{fmt(r.partnerDebt)}</b></td>
              <td style={{ ...td, textAlign: 'right', fontFamily: mono, color: held ? C.orange : C.dim }}>{fmt(r.clientPaid)}</td>
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr><td colSpan={showDate ? 9 : 7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 24 }}>Yozuv yo‘q</td></tr>
        )}
      </tbody>
    </table>
  );
}

function Kpi({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 200px' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: color + '18', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, lineHeight: 1.1, fontFamily: mono }}>{value}</div>
        <div style={{ color: C.mut, fontSize: 11, marginTop: 2 }}>{label}{sub && <span style={{ color: C.dim }}> · {sub}</span>}</div>
      </div>
    </div>
  );
}
