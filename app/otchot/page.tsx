'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  CheckCircle2, AlertTriangle, FileWarning, GitCompareArrows, Coins, Layers,
  Ticket, Wallet, FolderClock, Calendar,
} from 'lucide-react';
import type { SverkaData, SverkaRow, OtchotListItem } from '@/types/avia';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : n.toLocaleString('en-US').replaceAll(',', ' ');

type FilterKey = 'all' | 'match' | 'farq' | 'reissue' | 'only_beg' | 'namebad' | 'miss';
type Tab = 'biletlar' | 'pullar';

const C = {
  bg: '#0A0F0D', card: '#141F19', line: '#1E2E24', mut: '#8A9A8F', dim: '#4A5C50',
  green: '#7CFF4F', blue: '#2CA5E0', orange: '#F5A623', red: '#FF4444',
};

const OY_NOM: Record<string, string> = {
  '2026-01': 'Yanvar 2026', '2026-02': 'Fevral 2026', '2026-03': 'Mart 2026',
  '2026-04': 'Aprel 2026', '2026-05': 'May 2026', '2026-06': 'Iyun 2026',
  '2026-07': 'Iyul 2026', '2026-08': 'Avgust 2026', '2026-09': 'Sentabr 2026',
  '2026-10': 'Oktabr 2026', '2026-11': 'Noyabr 2026', '2026-12': 'Dekabr 2026',
};
const oyLabel = (it: OtchotListItem) => OY_NOM[it.oy] || it.oy || it.id;

function rowTone(r: SverkaRow): string | undefined {
  if (r.holat === 'kiritilmagan') return 'rgba(255,68,68,0.07)';
  if (r.holat === 'only_beg') return 'rgba(245,166,35,0.08)';
  if (r.farqTuri === 'farq') return 'rgba(245,166,35,0.10)';
  if (r.farqTuri === 'reissue') return 'rgba(44,165,224,0.08)';
  if (r.holat === 'matched' && r.nomMos === false) return 'rgba(255,68,68,0.07)';
  return undefined;
}

function Tag({ r }: { r: SverkaRow }) {
  const base: React.CSSProperties = { display: 'inline-block', padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' };
  const mk = (c: string, t: string) => <span style={{ ...base, backgroundColor: c + '18', color: c, border: `1px solid ${c}40` }}>{t}</span>;
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

export default function OtchotPage() {
  const { data: listData } = useSWR<{ otchotlar: OtchotListItem[] }>('/api/avia/otchot', fetcher, { revalidateOnFocus: false });
  const months = useMemo(() => listData?.otchotlar ?? [], [listData]);

  const [selected, setSelected] = useState<string>('');
  // Birinchi yuklanganda eng oxirgi (birinchi) oyni tanlash
  useEffect(() => {
    if (!selected && months.length > 0) setSelected(months[0].id);
  }, [months, selected]);

  const { data } = useSWR<SverkaData>(selected ? `/api/avia/otchot?id=${selected}` : null, fetcher, { revalidateOnFocus: false });

  const [tab, setTab] = useState<Tab>('biletlar');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [q, setQ] = useState('');

  const rows = useMemo(() => data?.yozuvlar ?? [], [data]);
  const s = data?.meta?.sverka;

  const money = useMemo(() => {
    const m = new Map<string, { kont: string; count: number; sotuv: number; refund: number; beg: number; src: number }>();
    for (const r of rows) {
      const k = r.kontragent || '—';
      const acc = m.get(k) || { kont: k, count: 0, sotuv: 0, refund: 0, beg: 0, src: 0 };
      acc.count += 1;
      if (typeof r.begzodJami === 'number') { acc.beg += r.begzodJami; if (r.begzodJami >= 0) acc.sotuv += r.begzodJami; else acc.refund += r.begzodJami; }
      if (typeof r.manbaJami === 'number') acc.src += r.manbaJami;
      m.set(k, acc);
    }
    return Array.from(m.values()).sort((a, b) => b.beg - a.beg);
  }, [rows]);
  const totBeg = money.reduce((x, a) => x + a.beg, 0);
  const totSotuv = money.reduce((x, a) => x + a.sotuv, 0);
  const totRefund = money.reduce((x, a) => x + a.refund, 0);
  const totSrc = money.reduce((x, a) => x + a.src, 0);

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
      if (ok && needle) ok = (`${r.biletRaqam} ${r.familiya} ${r.ism} ${r.nomi} ${r.kontragent}`).toLowerCase().includes(needle);
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

  const tabBtn = (key: Tab, icon: React.ReactNode, label: string) => {
    const active = tab === key;
    return (
      <button onClick={() => setTab(key)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, fontSize: 13.5, cursor: 'pointer', fontWeight: active ? 700 : 500, border: `1px solid ${active ? C.green : C.line}`, backgroundColor: active ? C.green + '18' : C.card, color: active ? C.green : C.mut }}>
        {icon}{label}
      </button>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <FolderClock size={24} style={{ color: C.green }} /> Otchot
        </h1>
        <div style={{ color: C.dim, fontSize: 12, marginTop: 5 }}>
          Oyni tanlang — biletlar va pullar, aviakompaniya hisobotlari bilan solishtirilgan holda.
        </div>
      </div>

      {/* Oy tanlagich */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <Calendar size={16} style={{ color: C.mut }} />
        {months.length === 0 && <span style={{ color: C.dim, fontSize: 13 }}>{listData ? 'Otchot yo‘q' : 'Yuklanmoqda…'}</span>}
        {months.map((it) => {
          const active = selected === it.id;
          return (
            <button key={it.id} onClick={() => setSelected(it.id)}
              style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13.5, cursor: 'pointer', fontWeight: active ? 700 : 500,
                border: `1px solid ${active ? C.green : C.line}`, backgroundColor: active ? C.green + '18' : C.card, color: active ? C.green : C.mut }}>
              {oyLabel(it)}
            </button>
          );
        })}
      </div>

      {!selected ? null : (
        <>
          {/* KPI */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Kpi icon={<Layers size={18} />} label="Biletlar" value={String(s?.begCount ?? 0)} color={C.blue} />
            <Kpi icon={<CheckCircle2 size={18} />} label="Mos kelgan" value={String(s?.match ?? 0)} color={C.green} />
            <Kpi icon={<Coins size={18} />} label="Summa farqi" value={String(s?.farq ?? 0)} color={C.orange} />
            <Kpi icon={<AlertTriangle size={18} />} label="Faqat Begzodda" value={String(s?.onlyBeg ?? 0)} color={C.orange} />
            <Kpi icon={<FileWarning size={18} />} label="Kiritilmagan" value={String(s?.srcOnly ?? 0)} color={C.red} />
            <Kpi icon={<Wallet size={18} />} label="Jami summa (UZS)" value={fmt(s?.begSum ?? 0)} color={C.green} />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {tabBtn('biletlar', <Ticket size={16} />, 'Biletlar')}
            {tabBtn('pullar', <Wallet size={16} />, 'Pullar')}
          </div>

          {tab === 'biletlar' ? (
            <>
              <div style={{ color: C.mut, fontSize: 11.5, lineHeight: 1.8, marginBottom: 12 }}>
                <b style={{ color: '#fff' }}>Izoh:</b> 🟧 <b>Summa farqi</b> — yaxlitlash/komissiyadan tashqari haqiqiy farq. &nbsp;
                🟦 <b>Qayta rasm.</b> — bir tomonda 0, ikkinchisida qiymat. &nbsp;
                <span style={{ color: C.dim }}>marja</span> — Centrum (net) va 762/UH (+200k): tizimli. &nbsp;
                🟨 <b>Faqat Begzodda</b> — manba yo‘q. &nbsp; 🟥 <b>Kiritilmagan</b> — aviakompaniyada bor, Begzod yozmagan.
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                {filters.map((f) => {
                  const active = filter === f.key;
                  return (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                      style={{ padding: '7px 13px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: `1px solid ${active ? C.green : C.line}`, backgroundColor: active ? C.green + '18' : C.card, color: active ? C.green : C.mut, fontWeight: active ? 700 : 400 }}>
                      {f.label}
                    </button>
                  );
                })}
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish: bilet yoki F.I.O…"
                  style={{ flex: '1 1 200px', minWidth: 180, backgroundColor: C.card, border: `1px solid ${C.line}`, color: '#fff', padding: '9px 13px', borderRadius: 8, fontSize: 13, outline: 'none' }} />
              </div>

              <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                    <thead>
                      <tr>
                        <th style={th}>Sana</th><th style={th}>Bilet raqami</th><th style={th}>Familiya</th><th style={th}>Ism</th>
                        <th style={{ ...th, textAlign: 'right' }}>Begzod jami</th><th style={th}>Kontragent</th>
                        <th style={{ ...th, textAlign: 'right' }}>Manba jami</th><th style={{ ...th, textAlign: 'right' }}>Δ farq</th><th style={th}>Holat</th>
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
                          <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-geist-mono)', color: r.farq ? (r.farq < 0 ? C.red : C.orange) : C.dim }}>{r.farq == null ? '' : (r.farq > 0 ? '+' : '') + fmt(r.farq)}</td>
                          <td style={td}><Tag r={r} /></td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>{data ? 'Bu filtr bo‘yicha yozuv yo‘q' : 'Yuklanmoqda…'}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '8px 12px', color: C.dim, fontSize: 11, borderTop: `1px solid ${C.line}` }}>
                  Ko‘rsatilmoqda: {filtered.length} / {rows.length} yozuv
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <Kpi icon={<Wallet size={18} />} label="Jami sotuv (Begzod)" value={fmt(totSotuv)} color={C.green} />
                <Kpi icon={<AlertTriangle size={18} />} label="Refundlar" value={fmt(totRefund)} color={C.red} />
                <Kpi icon={<Coins size={18} />} label="Sof (net)" value={fmt(totBeg)} color={C.blue} />
                <Kpi icon={<GitCompareArrows size={18} />} label="Manba summa" value={fmt(totSrc)} color={C.orange} />
              </div>

              <div style={{ color: C.mut, fontSize: 11.5, marginBottom: 12 }}>
                Kontragent bo‘yicha pul yig‘indisi. <b style={{ color: '#fff' }}>Begzod summa</b> = sotuv narxi (gross),
                <b style={{ color: '#fff' }}> Manba summa</b> = aviakompaniya hisoboti.
              </div>

              <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                    <thead>
                      <tr>
                        <th style={th}>Kontragent</th>
                        <th style={{ ...th, textAlign: 'right' }}>Biletlar</th>
                        <th style={{ ...th, textAlign: 'right' }}>Sotuv</th>
                        <th style={{ ...th, textAlign: 'right' }}>Refund</th>
                        <th style={{ ...th, textAlign: 'right' }}>Begzod (net)</th>
                        <th style={{ ...th, textAlign: 'right' }}>Manba summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {money.map((m) => (
                        <tr key={m.kont}>
                          <td style={{ ...td, color: '#fff', fontWeight: 600 }}>{m.kont}</td>
                          <td style={{ ...td, textAlign: 'right', color: C.mut }}>{m.count}</td>
                          <td style={{ ...td, textAlign: 'right', color: C.green, fontFamily: 'var(--font-geist-mono)' }}>{fmt(m.sotuv)}</td>
                          <td style={{ ...td, textAlign: 'right', color: m.refund ? C.red : C.dim, fontFamily: 'var(--font-geist-mono)' }}>{m.refund ? fmt(m.refund) : '—'}</td>
                          <td style={{ ...td, textAlign: 'right', color: '#e6f0ea', fontFamily: 'var(--font-geist-mono)' }}>{fmt(m.beg)}</td>
                          <td style={{ ...td, textAlign: 'right', color: C.mut, fontFamily: 'var(--font-geist-mono)' }}>{fmt(m.src)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ ...td, color: '#fff', fontWeight: 800, borderTop: `2px solid ${C.line}` }}>JAMI</td>
                        <td style={{ ...td, textAlign: 'right', color: C.mut, fontWeight: 800, borderTop: `2px solid ${C.line}` }}>{rows.length}</td>
                        <td style={{ ...td, textAlign: 'right', color: C.green, fontWeight: 800, borderTop: `2px solid ${C.line}`, fontFamily: 'var(--font-geist-mono)' }}>{fmt(totSotuv)}</td>
                        <td style={{ ...td, textAlign: 'right', color: C.red, fontWeight: 800, borderTop: `2px solid ${C.line}`, fontFamily: 'var(--font-geist-mono)' }}>{fmt(totRefund)}</td>
                        <td style={{ ...td, textAlign: 'right', color: '#fff', fontWeight: 800, borderTop: `2px solid ${C.line}`, fontFamily: 'var(--font-geist-mono)' }}>{fmt(totBeg)}</td>
                        <td style={{ ...td, textAlign: 'right', color: C.mut, fontWeight: 800, borderTop: `2px solid ${C.line}`, fontFamily: 'var(--font-geist-mono)' }}>{fmt(totSrc)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
