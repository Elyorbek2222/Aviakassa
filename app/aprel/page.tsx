'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  CheckCircle2, AlertTriangle, FileWarning, GitCompareArrows, Coins, Layers,
} from 'lucide-react';
import type { SverkaData, SverkaRow } from '@/types/avia';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// To'liq summa — ming ajratuvchi probel bilan (sverka uchun aniq son kerak)
const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : n.toLocaleString('en-US').replaceAll(',', ' ');

type FilterKey = 'all' | 'match' | 'farq' | 'reissue' | 'only_beg' | 'namebad' | 'miss';

const C = {
  bg: '#0A0F0D', card: '#141F19', line: '#1E2E24', mut: '#8A9A8F', dim: '#4A5C50',
  green: '#7CFF4F', blue: '#2CA5E0', orange: '#F5A623', red: '#FF4444', purple: '#9B59B6',
};

function rowTone(r: SverkaRow): string | undefined {
  if (r.holat === 'kiritilmagan') return 'rgba(255,68,68,0.07)';
  if (r.holat === 'only_beg') return 'rgba(245,166,35,0.08)';
  if (r.farqTuri === 'farq') return 'rgba(245,166,35,0.10)';
  if (r.farqTuri === 'reissue') return 'rgba(44,165,224,0.08)';
  if (r.holat === 'matched' && r.nomMos === false) return 'rgba(255,68,68,0.07)';
  return undefined;
}

function Tag({ r }: { r: SverkaRow }) {
  const base: React.CSSProperties = {
    display: 'inline-block', padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
    whiteSpace: 'nowrap',
  };
  const mk = (c: string, t: string) => (
    <span style={{ ...base, backgroundColor: c + '18', color: c, border: `1px solid ${c}40` }}>{t}</span>
  );
  if (r.holat === 'kiritilmagan') return mk(C.red, 'kiritilmagan');
  if (r.holat === 'only_beg') return mk(C.orange, 'faqat Begzod');
  if (r.holat === 'no_ticket') return mk(C.dim, 'bilet yo‘q');
  if (r.farqTuri === 'farq') return mk(C.orange, 'SUMMA FARQI');
  if (r.farqTuri === 'reissue') return mk(C.blue, 'qayta rasm.');
  if (r.farqTuri === 'marja') return mk(C.dim, 'marja');
  if (r.holat === 'matched' && r.nomMos === false) return mk(C.red, 'nomi mos emas');
  return mk(C.green, 'mos');
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 150, flex: '1 1 150px' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: color + '18', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
        <div style={{ color: C.mut, fontSize: 11, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

export default function AprelOtchotPage() {
  const { data } = useSWR<SverkaData>('/api/avia/aprel', fetcher, { revalidateOnFocus: false });
  const [filter, setFilter] = useState<FilterKey>('all');
  const [q, setQ] = useState('');

  const rows = useMemo(() => data?.yozuvlar ?? [], [data]);
  const s = data?.meta?.sverka;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      let ok = true;
      if (filter === 'match') ok = r.holat === 'matched' && (r.farqTuri === 'ok' || r.farqTuri === 'marja') && r.nomMos !== false;
      else if (filter === 'farq') ok = r.farqTuri === 'farq';
      else if (filter === 'reissue') ok = r.farqTuri === 'reissue';
      else if (filter === 'only_beg') ok = r.holat === 'only_beg';
      else if (filter === 'namebad') ok = r.holat === 'matched' && r.nomMos === false;
      else if (filter === 'miss') ok = r.holat === 'kiritilmagan';
      if (ok && needle) {
        ok = (`${r.biletRaqam} ${r.familiya} ${r.ism} ${r.nomi} ${r.kontragent}`).toLowerCase().includes(needle);
      }
      return ok;
    });
  }, [rows, filter, q]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Hammasi' },
    { key: 'match', label: '✅ Mos' },
    { key: 'farq', label: '🟧 Summa farqi' },
    { key: 'reissue', label: '🟦 Qayta rasm.' },
    { key: 'only_beg', label: '🟨 Faqat Begzodda' },
    { key: 'namebad', label: '⚠️ Nomi mos emas' },
    { key: 'miss', label: '🟥 Kiritilmagan' },
  ];

  const th: React.CSSProperties = { padding: '9px 10px', textAlign: 'left', color: C.mut, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', top: 0, backgroundColor: '#0E1611', borderBottom: `2px solid ${C.line}` };
  const td: React.CSSProperties = { padding: '7px 10px', fontSize: 12, borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap' };

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <GitCompareArrows size={24} style={{ color: C.green }} /> Aprel 2026 — Sverka otchoti
        </h1>
        <div style={{ color: C.dim, fontSize: 12, marginTop: 5 }}>
          Begzod (aviakassir) ledger’i ↔ aviakompaniya hisobotlari. Solishtirish bilet raqami bo‘yicha.
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <Kpi icon={<Layers size={18} />} label="Begzod biletlari" value={String(s?.begCount ?? 0)} color={C.blue} />
        <Kpi icon={<CheckCircle2 size={18} />} label="Mos kelgan" value={String(s?.match ?? 0)} color={C.green} />
        <Kpi icon={<Coins size={18} />} label="Summa farqi" value={String(s?.farq ?? 0)} color={C.orange} />
        <Kpi icon={<AlertTriangle size={18} />} label="Faqat Begzodda" value={String(s?.onlyBeg ?? 0)} color={C.orange} />
        <Kpi icon={<FileWarning size={18} />} label="Kiritilmagan" value={String(s?.srcOnly ?? 0)} color={C.red} />
        <Kpi icon={<Coins size={18} />} label="Begzod summa (UZS)" value={fmt(s?.begSum ?? 0)} color={C.green} />
      </div>

      {/* Legend */}
      <div style={{ color: C.mut, fontSize: 11.5, lineHeight: 1.8, marginBottom: 12 }}>
        <b style={{ color: '#fff' }}>Izoh:</b> 🟧 <b>Summa farqi</b> — yaxlitlash/komissiyadan tashqari haqiqiy farq (tekshirish kerak). &nbsp;
        🟦 <b>Qayta rasmiylashtirish</b> — bir tomonda 0, ikkinchisida qiymat (CANX/reissue). &nbsp;
        <span style={{ color: C.dim }}>marja</span> — Centrum (net narx) va 762/UH (+200k marja): tizimli, xato emas. &nbsp;
        🟨 <b>Faqat Begzodda</b> — aviakompaniya hisoboti bizda yo‘q. &nbsp;
        🟥 <b>Kiritilmagan</b> — aviakompaniyada bor, Begzod yozmagan.
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding: '7px 13px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${active ? C.green : C.line}`,
                backgroundColor: active ? C.green + '18' : C.card,
                color: active ? C.green : C.mut, fontWeight: active ? 700 : 400 }}>
              {f.label}
            </button>
          );
        })}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish: bilet yoki F.I.O…"
          style={{ flex: '1 1 200px', minWidth: 180, backgroundColor: C.card, border: `1px solid ${C.line}`,
            color: '#fff', padding: '9px 13px', borderRadius: 8, fontSize: 13, outline: 'none' }} />
      </div>

      {/* Table */}
      <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ maxHeight: '64vh', overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={th}>Sana</th>
                <th style={th}>Bilet raqami</th>
                <th style={th}>Familiya</th>
                <th style={th}>Ism</th>
                <th style={{ ...th, textAlign: 'right' }}>Begzod jami</th>
                <th style={th}>Kontragent (manba)</th>
                <th style={{ ...th, textAlign: 'right' }}>Manba jami</th>
                <th style={{ ...th, textAlign: 'right' }}>Δ farq</th>
                <th style={th}>Holat</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ backgroundColor: rowTone(r) }}>
                  <td style={{ ...td, color: C.mut }}>{r.sana || '—'}</td>
                  <td style={{ ...td, color: '#fff', fontFamily: 'var(--font-geist-mono)' }}>{r.biletRaqam}</td>
                  <td style={{ ...td, color: '#fff' }}>{r.familiya}</td>
                  <td style={{ ...td, color: C.mut }}>{r.ism}</td>
                  <td style={{ ...td, textAlign: 'right', color: r.begzodJami != null && r.begzodJami < 0 ? C.red : '#e6f0ea', fontFamily: 'var(--font-geist-mono)' }}>{fmt(r.begzodJami)}</td>
                  <td style={{ ...td, color: C.mut }}>{r.kontragent || '—'}</td>
                  <td style={{ ...td, textAlign: 'right', color: r.manbaJami != null && r.manbaJami < 0 ? C.red : '#e6f0ea', fontFamily: 'var(--font-geist-mono)' }}>{fmt(r.manbaJami)}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-geist-mono)', color: r.farq ? (r.farq < 0 ? C.red : C.orange) : C.dim }}>
                    {r.farq == null ? '' : (r.farq > 0 ? '+' : '') + fmt(r.farq)}
                  </td>
                  <td style={td}><Tag r={r} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>
                  {data ? 'Bu filtr bo‘yicha yozuv yo‘q' : 'Yuklanmoqda…'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 12px', color: C.dim, fontSize: 11, borderTop: `1px solid ${C.line}` }}>
          Ko‘rsatilmoqda: {filtered.length} / {rows.length} yozuv
        </div>
      </div>
    </div>
  );
}
