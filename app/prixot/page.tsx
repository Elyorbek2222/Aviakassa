'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Coins, Wallet, GitCompareArrows, Calendar, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';
import { PRIXOT_TUR_LABEL, PRIXOT_HISOB_TURLARI, type PrixotYozuv, type PrixotTur } from '@/types/avia';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = (n: number) => Math.round(n || 0).toLocaleString('en-US').replaceAll(',', ' ');

const OY_NOM: Record<string, string> = {
  '2026-01': 'Yanvar', '2026-02': 'Fevral', '2026-03': 'Mart', '2026-04': 'Aprel', '2026-05': 'May',
  '2026-06': 'Iyun', '2026-07': 'Iyul', '2026-08': 'Avgust', '2026-09': 'Sentabr', '2026-10': 'Oktabr',
  '2026-11': 'Noyabr', '2026-12': 'Dekabr',
};
const oyLabel = (oy: string) => (OY_NOM[oy] ? `${OY_NOM[oy]} ${oy.slice(0, 4)}` : oy);

const C = {
  card: '#141F19', line: '#1E2E24', mut: '#8A9A8F', dim: '#4A5C50',
  green: '#7CFF4F', blue: '#2CA5E0', orange: '#F5A623', red: '#FF4444', purple: '#9B59B6',
};
const TUR_COLOR: Record<PrixotTur, string> = {
  bilet: C.green, otkazma: C.blue, obmen: C.purple, foyda: C.orange, tur: C.dim, boshqa: C.dim,
};
const TURLAR = Object.keys(PRIXOT_TUR_LABEL) as PrixotTur[];

interface PrixotResp { oy: string; yozuvlar: PrixotYozuv[]; otchotBegSum: number }

export default function PrixotPage() {
  const { data: auth } = useSWR<{ user?: { role?: string } }>('/api/avia/auth', fetcher, { revalidateOnFocus: false });
  const isAdmin = auth?.user?.role === 'admin';

  const { data: listData } = useSWR<{ oylar: string[] }>('/api/avia/prixot', fetcher, { revalidateOnFocus: false });
  const oylar = useMemo(() => listData?.oylar ?? [], [listData]);
  const [selected, setSelected] = useState('');
  const activeOy = selected || oylar[0] || '';

  const { data, mutate } = useSWR<PrixotResp>(activeOy ? `/api/avia/prixot?oy=${activeOy}` : null, fetcher, { revalidateOnFocus: false });
  const rows = useMemo(() => data?.yozuvlar ?? [], [data]);
  const otchotBeg = data?.otchotBegSum ?? 0;

  const [edits, setEdits] = useState<Record<string, Partial<PrixotYozuv>>>({});
  const [q, setQ] = useState('');
  const [turFilter, setTurFilter] = useState<PrixotTur | 'all'>('all');
  const [busy, setBusy] = useState(false);
  const [nw, setNw] = useState<{ sana: string; mijoz: string; summa: string; tur: PrixotTur; biletRaqam: string; izoh: string }>({
    sana: `${activeOy}-01`, mijoz: '', summa: '', tur: 'bilet', biletRaqam: '', izoh: '',
  });

  // Summary — faqat serverdagi ma'lumot bo'yicha (tahrir saqlangach yangilanadi)
  const totals = useMemo(() => {
    const t: Record<string, number> = { bilet: 0, otkazma: 0, obmen: 0, foyda: 0, tur: 0, boshqa: 0 };
    for (const r of rows) t[r.tur] = (t[r.tur] || 0) + r.summa;
    const kirganPul = PRIXOT_HISOB_TURLARI.reduce((s, k) => s + (t[k] || 0), 0);
    return { ...t, kirganPul, farq: kirganPul - otchotBeg };
  }, [rows, otchotBeg]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (turFilter !== 'all' && r.tur !== turFilter) return false;
      if (needle && !(`${r.mijoz} ${r.biletRaqam || ''} ${r.izoh || ''}`).toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, q, turFilter]);

  const val = (r: PrixotYozuv, k: keyof PrixotYozuv) => {
    const e = edits[r.id];
    return (e && k in e ? e[k] : r[k]) as string | number | undefined;
  };
  const setEdit = (id: string, k: keyof PrixotYozuv, v: string) =>
    setEdits((p) => ({ ...p, [id]: { ...p[id], [k]: k === 'summa' ? Number(v.replace(/\s/g, '')) || 0 : v } }));
  const isDirty = (id: string) => !!edits[id] && Object.keys(edits[id]).length > 0;

  const save = async (r: PrixotYozuv) => {
    if (!isDirty(r.id)) return;
    setBusy(true);
    try {
      await fetch('/api/avia/prixot', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oy: activeOy, id: r.id, ...edits[r.id] }) });
      setEdits((p) => { const n = { ...p }; delete n[r.id]; return n; });
      await mutate();
    } finally { setBusy(false); }
  };
  const del = async (r: PrixotYozuv) => {
    if (!confirm(`O'chirilsinmi?\n${r.mijoz} — ${fmt(r.summa)}`)) return;
    setBusy(true);
    try {
      await fetch(`/api/avia/prixot?oy=${activeOy}&id=${r.id}`, { method: 'DELETE' });
      await mutate();
    } finally { setBusy(false); }
  };
  const add = async () => {
    if (!nw.summa && !nw.mijoz) return;
    setBusy(true);
    try {
      await fetch('/api/avia/prixot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oy: activeOy, ...nw, summa: Number(nw.summa.replace(/\s/g, '')) || 0 }) });
      setNw({ sana: `${activeOy}-01`, mijoz: '', summa: '', tur: 'bilet', biletRaqam: '', izoh: '' });
      await mutate();
    } finally { setBusy(false); }
  };

  const th: React.CSSProperties = { padding: '9px 10px', textAlign: 'left', color: C.mut, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', top: 0, backgroundColor: '#0E1611', borderBottom: `2px solid ${C.line}` };
  const td: React.CSSProperties = { padding: '6px 8px', fontSize: 12, borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap' };
  const inp: React.CSSProperties = { backgroundColor: '#0A0F0D', border: `1px solid ${C.line}`, color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, outline: 'none', width: '100%' };

  const Kpi = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
    <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 160px' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: color + '18', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
        <div style={{ color: C.mut, fontSize: 11, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Coins size={24} style={{ color: C.green }} /> Prixot sverka — kirgan pullar
        </h1>
        <div style={{ color: C.dim, fontSize: 12, marginTop: 5 }}>
          Biletlar uchun kirgan pul aviakompaniya otchoti bilan solishtiriladi. {isAdmin ? 'Xato bo‘lsa qatorni tahrirlab tuzating.' : 'Tahrirlash — faqat admin.'}
        </div>
      </div>

      {/* Oy tanlagich */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <Calendar size={16} style={{ color: C.mut }} />
        {oylar.length === 0 && <span style={{ color: C.dim, fontSize: 13 }}>{listData ? 'Prixot yo‘q' : 'Yuklanmoqda…'}</span>}
        {oylar.map((oy) => {
          const active = activeOy === oy;
          return (
            <button key={oy} onClick={() => { setSelected(oy); setEdits({}); setNw((p) => ({ ...p, sana: `${oy}-01` })); }}
              style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13.5, cursor: 'pointer', fontWeight: active ? 700 : 500, border: `1px solid ${active ? C.green : C.line}`, backgroundColor: active ? C.green + '18' : C.card, color: active ? C.green : C.mut }}>
              {oyLabel(oy)}
            </button>
          );
        })}
      </div>

      {!activeOy ? null : (
        <>
          {/* Summary */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
            <Kpi icon={<Wallet size={18} />} label="Kirgan pul (bilet + o'tkazma)" value={fmt(totals.kirganPul)} color={C.green} />
            <Kpi icon={<GitCompareArrows size={18} />} label="Aviakompaniya otchot (begzod)" value={fmt(otchotBeg)} color={C.blue} />
            <Kpi icon={<AlertTriangle size={18} />} label="FARQ (kirgan − otchot)" value={(totals.farq >= 0 ? '+' : '') + fmt(totals.farq)} color={totals.farq < 0 ? C.red : C.green} />
            <Kpi icon={<Coins size={18} />} label="Obmen (dollar, alohida)" value={fmt(totals.obmen)} color={C.purple} />
          </div>
          <div style={{ color: C.dim, fontSize: 11.5, marginBottom: 16 }}>
            Foyda: {fmt(totals.foyda)} · Tur mahsuloti: {fmt(totals.tur)} · Boshqa: {fmt(totals.boshqa)}.
            &nbsp;Manfiy farq — qarz / dollar-obmen orqali yopilgan / vaqt farqi. Obmen va Foyda balansga kirmaydi.
          </div>

          {/* Qo'shish (admin) */}
          {isAdmin && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12, backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: 10 }}>
              <input type="date" value={nw.sana} onChange={(e) => setNw({ ...nw, sana: e.target.value })} style={{ ...inp, width: 150 }} />
              <input placeholder="Mijoz" value={nw.mijoz} onChange={(e) => setNw({ ...nw, mijoz: e.target.value })} style={{ ...inp, flex: '2 1 220px' }} />
              <input placeholder="Summa" inputMode="numeric" value={nw.summa} onChange={(e) => setNw({ ...nw, summa: e.target.value })} style={{ ...inp, width: 130, textAlign: 'right' }} />
              <select value={nw.tur} onChange={(e) => setNw({ ...nw, tur: e.target.value as PrixotTur })} style={{ ...inp, width: 150 }}>
                {TURLAR.map((t) => <option key={t} value={t}>{PRIXOT_TUR_LABEL[t]}</option>)}
              </select>
              <input placeholder="Bilet raqami (ixtiyoriy)" value={nw.biletRaqam} onChange={(e) => setNw({ ...nw, biletRaqam: e.target.value })} style={{ ...inp, flex: '1 1 150px' }} />
              <button onClick={add} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.green}`, backgroundColor: C.green + '18', color: C.green, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={15} /> Qo'shish
              </button>
            </div>
          )}

          {/* Filtrlar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <button onClick={() => setTurFilter('all')} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: `1px solid ${turFilter === 'all' ? C.green : C.line}`, backgroundColor: turFilter === 'all' ? C.green + '18' : C.card, color: turFilter === 'all' ? C.green : C.mut }}>Hammasi</button>
            {TURLAR.map((t) => (
              <button key={t} onClick={() => setTurFilter(t)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: `1px solid ${turFilter === t ? TUR_COLOR[t] : C.line}`, backgroundColor: turFilter === t ? TUR_COLOR[t] + '18' : C.card, color: turFilter === t ? TUR_COLOR[t] : C.mut }}>{PRIXOT_TUR_LABEL[t]}</button>
            ))}
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish: mijoz / bilet…" style={{ flex: '1 1 200px', minWidth: 160, backgroundColor: C.card, border: `1px solid ${C.line}`, color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 13, outline: 'none' }} />
          </div>

          {/* Jadval */}
          <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: 130 }}>Sana</th>
                    <th style={th}>Mijoz</th>
                    <th style={{ ...th, textAlign: 'right', width: 140 }}>Summa</th>
                    <th style={{ ...th, width: 150 }}>Tur</th>
                    <th style={{ ...th, width: 150 }}>Bilet raqami</th>
                    <th style={th}>Izoh</th>
                    {isAdmin && <th style={{ ...th, width: 90 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const dirty = isDirty(r.id);
                    const tur = (val(r, 'tur') as PrixotTur) || 'boshqa';
                    return (
                      <tr key={r.id} style={{ backgroundColor: dirty ? C.orange + '10' : undefined }}>
                        <td style={td}>{isAdmin
                          ? <input type="date" value={String(val(r, 'sana') || '')} onChange={(e) => setEdit(r.id, 'sana', e.target.value)} style={inp} />
                          : <span style={{ color: C.mut }}>{r.sana}</span>}</td>
                        <td style={{ ...td, whiteSpace: 'normal' }}>{isAdmin
                          ? <input value={String(val(r, 'mijoz') || '')} onChange={(e) => setEdit(r.id, 'mijoz', e.target.value)} style={inp} />
                          : <span style={{ color: '#fff' }}>{r.mijoz}</span>}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{isAdmin
                          ? <input inputMode="numeric" value={String(val(r, 'summa') ?? 0)} onChange={(e) => setEdit(r.id, 'summa', e.target.value)} style={{ ...inp, textAlign: 'right', fontFamily: 'var(--font-geist-mono)' }} />
                          : <span style={{ color: '#e6f0ea', fontFamily: 'var(--font-geist-mono)' }}>{fmt(r.summa)}</span>}</td>
                        <td style={td}>{isAdmin
                          ? <select value={tur} onChange={(e) => setEdit(r.id, 'tur', e.target.value)} style={inp}>{TURLAR.map((t) => <option key={t} value={t}>{PRIXOT_TUR_LABEL[t]}</option>)}</select>
                          : <span style={{ color: TUR_COLOR[tur] }}>{PRIXOT_TUR_LABEL[tur]}</span>}</td>
                        <td style={td}>{isAdmin
                          ? <input value={String(val(r, 'biletRaqam') || '')} onChange={(e) => setEdit(r.id, 'biletRaqam', e.target.value)} style={{ ...inp, fontFamily: 'var(--font-geist-mono)' }} />
                          : <span style={{ color: C.mut, fontFamily: 'var(--font-geist-mono)' }}>{r.biletRaqam || '—'}</span>}</td>
                        <td style={{ ...td, whiteSpace: 'normal' }}>{isAdmin
                          ? <input value={String(val(r, 'izoh') || '')} onChange={(e) => setEdit(r.id, 'izoh', e.target.value)} style={inp} />
                          : <span style={{ color: C.dim }}>{r.izoh || ''}</span>}</td>
                        {isAdmin && (
                          <td style={{ ...td, textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              <button title="Saqlash" onClick={() => save(r)} disabled={!dirty || busy} style={{ padding: 6, borderRadius: 6, border: `1px solid ${dirty ? C.green : C.line}`, backgroundColor: dirty ? C.green + '18' : 'transparent', color: dirty ? C.green : C.dim, cursor: dirty ? 'pointer' : 'default', display: 'flex' }}><Save size={14} /></button>
                              <button title="O'chirish" onClick={() => del(r)} disabled={busy} style={{ padding: 6, borderRadius: 6, border: `1px solid ${C.red}40`, backgroundColor: C.red + '10', color: C.red, cursor: 'pointer', display: 'flex' }}><Trash2 size={14} /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={isAdmin ? 7 : 6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>{data ? 'Yozuv yo‘q' : 'Yuklanmoqda…'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '8px 12px', color: C.dim, fontSize: 11, borderTop: `1px solid ${C.line}` }}>
              Ko‘rsatilmoqda: {filtered.length} / {rows.length} yozuv
            </div>
          </div>
        </>
      )}
    </div>
  );
}
