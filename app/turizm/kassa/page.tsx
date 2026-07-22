'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Wallet, ArrowLeftRight, Repeat, Landmark, PlusCircle, Trash2, Calendar, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Banknote, CreditCard,
} from 'lucide-react';
import {
  TURIZM_HISOB_LABEL, TURIZM_KASSA_TUR_LABEL,
  type TurizmHisob, type TurizmKassaYozuv,
} from '@/types/avia';
import { TURIZM_HISOBLAR, hisobValyuta, hisobNaxtmi } from '@/lib/turizm-kassa';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = (n: number) => Math.round(n || 0).toLocaleString('en-US').replaceAll(',', ' ');
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthStart = () => todayISO().slice(0, 8) + '01';

// Xolat qiymatini valyuta bilan ko'rsatish
const money = (h: TurizmHisob, n: number) => (hisobValyuta(h) === 'usd' ? `$${fmt(n)}` : `${fmt(n)} so'm`);

const C = {
  card: '#141F19', line: '#1E2E24', mut: '#8A9A8F', dim: '#4A5C50', bg: '#0A0F0D',
  teal: '#22C7A9', green: '#7CFF4F', red: '#FF4444', orange: '#F5A623', gold: '#E0C34A',
};

const HISOB_RANG: Record<TurizmHisob, string> = {
  uzs_naxt: C.green, uzs_plastik: C.teal, usd_naxt: C.orange, usd_plastik: C.gold,
};

interface HisobBalans { kunBoshi: number; kirim: number; chiqim: number; kunOxiri: number }
interface OstatkaResp { today: string; from: string | null; to: string | null; balanslar: Record<TurizmHisob, HisobBalans> }
interface KassaResp { yozuvlar: TurizmKassaYozuv[] }

type OpTur = 'perevod' | 'obmen' | 'inkassatsiya' | 'boshlangich';

export default function TurizmKassaPage() {
  const { data: auth } = useSWR<{ user?: { role?: string; name?: string } }>('/api/avia/auth', fetcher, { revalidateOnFocus: false });
  const role = auth?.user?.role;
  const canUse = role === 'admin' || role === 'sardor';

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayISO());
  const q = `from=${from}&to=${to}`;
  const { data: ost, mutate: mutateOst } = useSWR<OstatkaResp>(`/api/avia/turizm/ostatka?${q}`, fetcher, { revalidateOnFocus: false });
  const { data: jur, mutate: mutateJur } = useSWR<KassaResp>('/api/avia/turizm/kassa', fetcher, { revalidateOnFocus: false });

  const refresh = async () => { await Promise.all([mutateOst(), mutateJur()]); };

  const bal = (h: TurizmHisob): HisobBalans => ost?.balanslar?.[h] ?? { kunBoshi: 0, kirim: 0, chiqim: 0, kunOxiri: 0 };
  const rows = useMemo(() => jur?.yozuvlar ?? [], [jur]);

  // Vaqtni render'da emas, mount'da o'qiymiz (React purity). Server 48s'ni baribir tekshiradi.
  const [now, setNow] = useState(0);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setNow(Date.now()); }, []);
  const createdMs = (id: string) => { const m = /^[A-Z]+-(\d{10,})-/.exec(id); return m ? Number(m[1]) : 0; };
  const canModify = (y: TurizmKassaYozuv) => role === 'admin' || (now > 0 && createdMs(y.id) > 0 && now - createdMs(y.id) < 48 * 3600 * 1000);

  const delRow = async (y: TurizmKassaYozuv) => {
    if (!confirm(`${TURIZM_KASSA_TUR_LABEL[y.tur]} — ${fmt(y.summa)} o'chirilsinmi?`)) return;
    const r = await fetch(`/api/avia/turizm/kassa?id=${encodeURIComponent(y.id)}`, { method: 'DELETE' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { alert(d.error || "O'chirishda xatolik"); return; }
    await refresh();
  };

  const th: React.CSSProperties = { padding: '9px 10px', textAlign: 'left', color: C.mut, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', borderBottom: `2px solid ${C.line}` };
  const td: React.CSSProperties = { padding: '8px 10px', fontSize: 12.5, borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap' };

  if (auth && !canUse) return <div style={{ color: C.mut, padding: 30 }}>Bu bo‘lim uchun ruxsat yo‘q.</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Wallet size={24} style={{ color: C.teal }} /> Turizm — Kassa (ostatka)
        </h1>
        <div style={{ color: C.dim, fontSize: 12, marginTop: 5 }}>
          4 xolat qoldig‘i · perevod / obmen / inkassatsiya. Prixot/rasxod avtomatik shu xolatlarga tushadi.
        </div>
      </div>

      {/* Sana oralig'i */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <Calendar size={16} style={{ color: C.mut }} />
        <span style={{ color: C.mut, fontSize: 12 }}>Kun boshi</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ backgroundColor: C.bg, border: `1px solid ${C.line}`, color: '#fff', padding: '7px 10px', borderRadius: 8, fontSize: 13 }} />
        <span style={{ color: C.mut, fontSize: 12 }}>→ oxiri</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ backgroundColor: C.bg, border: `1px solid ${C.line}`, color: '#fff', padding: '7px 10px', borderRadius: 8, fontSize: 13 }} />
      </div>

      {/* 4 xolat kartasi */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
        {TURIZM_HISOBLAR.map((h) => {
          const b = bal(h);
          const col = HISOB_RANG[h];
          return (
            <div key={h} style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: col + '18', border: `1px solid ${col}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col }}>
                  {hisobNaxtmi(h) ? <Banknote size={16} /> : <CreditCard size={16} />}
                </div>
                <span style={{ color: '#fff', fontSize: 13.5, fontWeight: 700 }}>{TURIZM_HISOB_LABEL[h]}</span>
              </div>
              <div style={{ color: col, fontSize: 21, fontWeight: 800, lineHeight: 1.1 }}>{money(h, b.kunOxiri)}</div>
              <div style={{ color: C.dim, fontSize: 11, marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '2px 8px' }}>
                <span>Kun boshi: {fmt(b.kunBoshi)}</span>
                <span style={{ color: C.green }}>+{fmt(b.kirim)}</span>
                <span style={{ color: C.red }}>−{fmt(b.chiqim)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operatsiya formasi */}
      <OperatsiyaPanel onDone={refresh} isAdmin={role === 'admin'} />

      {/* Jurnal */}
      <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden', marginTop: 18 }}>
        <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr>
                <th style={th}>Sana</th>
                <th style={th}>Operatsiya</th>
                <th style={th}>Xolat(lar)</th>
                <th style={{ ...th, textAlign: 'right' }}>Summa</th>
                <th style={th}>Izoh</th>
                <th style={th}>Kim</th>
                <th style={{ ...th, textAlign: 'center' }}>Amal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((y) => (
                <tr key={y.id}>
                  <td style={{ ...td, color: C.mut }}>{y.sana}</td>
                  <td style={{ ...td, color: '#e6f0ea' }}>{TURIZM_KASSA_TUR_LABEL[y.tur]}</td>
                  <td style={{ ...td, color: C.mut }}>
                    {y.from ? TURIZM_HISOB_LABEL[y.from] : ''}
                    {y.from && y.to ? ' → ' : ''}
                    {y.to ? TURIZM_HISOB_LABEL[y.to] : ''}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-geist-mono)', color: '#e6f0ea' }}>
                    {y.from ? money(y.from, y.summa) : y.to ? money(y.to, y.summa) : fmt(y.summa)}
                    {y.tur === 'obmen' && y.toSumma ? <div style={{ color: C.dim, fontSize: 10.5 }}>×{fmt(y.kurs || 0)} = {fmt(y.toSumma)} so‘m</div> : null}
                  </td>
                  <td style={{ ...td, whiteSpace: 'normal', color: C.dim }}>{y.xodim ? `${y.xodim}${y.izoh ? ' · ' + y.izoh : ''}` : (y.izoh || '')}</td>
                  <td style={{ ...td, color: C.dim }}>{y.yaratdi}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {canModify(y) && (
                      <button onClick={() => delRow(y)} title="O'chirish" style={{ display: 'inline-flex', padding: 5, borderRadius: 6, border: `1px solid ${C.line}`, backgroundColor: 'transparent', color: C.red, cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>{jur ? "Yozuv yo'q" : 'Yuklanmoqda…'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 12px', color: C.dim, fontSize: 11, borderTop: `1px solid ${C.line}` }}>{rows.length} yozuv</div>
      </div>
    </div>
  );
}

// ===== Operatsiya paneli (perevod / obmen / inkassatsiya / boshlang'ich) =====
const OP_META: { key: OpTur; label: string; icon: React.ReactNode }[] = [
  { key: 'perevod', label: 'Perevod', icon: <ArrowLeftRight size={16} /> },
  { key: 'obmen', label: 'Obmen', icon: <Repeat size={16} /> },
  { key: 'inkassatsiya', label: 'Inkassatsiya', icon: <Landmark size={16} /> },
  { key: 'boshlangich', label: "Boshlang'ich qoldiq", icon: <PlusCircle size={16} /> },
];

function OperatsiyaPanel({ onDone, isAdmin }: { onDone: () => Promise<void>; isAdmin: boolean }) {
  const [op, setOp] = useState<OpTur>('perevod');
  const [f, setF] = useState({ sana: todayISO(), from: '', to: '', summa: '', kurs: '', xodim: '', izoh: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const summaNum = Number(String(f.summa).replace(/\s/g, '')) || 0;
  const kursNum = Number(f.kurs) || 0;

  // Har operatsiya uchun xolat variantlari
  const fromOpts: TurizmHisob[] =
    op === 'obmen' ? TURIZM_HISOBLAR.filter((h) => hisobValyuta(h) === 'usd')
    : op === 'inkassatsiya' ? TURIZM_HISOBLAR.filter(hisobNaxtmi)
    : op === 'boshlangich' ? []
    : TURIZM_HISOBLAR;
  const toOpts: TurizmHisob[] =
    op === 'obmen' ? TURIZM_HISOBLAR.filter((h) => hisobValyuta(h) === 'uzs')
    : op === 'perevod' ? (f.from ? TURIZM_HISOBLAR.filter((h) => hisobValyuta(h) === hisobValyuta(f.from as TurizmHisob) && h !== f.from) : [])
    : op === 'boshlangich' ? TURIZM_HISOBLAR
    : [];

  const showFrom = op !== 'boshlangich';
  const showTo = op === 'perevod' || op === 'obmen' || op === 'boshlangich';
  const showKurs = op === 'obmen';
  const uzsPreview = showKurs && kursNum ? Math.round(summaNum * kursNum) : 0;

  const submit = async () => {
    setMsg(null);
    if (showFrom && !f.from) { setMsg({ ok: false, text: 'Chiqim xolatini tanlang' }); return; }
    if (showTo && !f.to) { setMsg({ ok: false, text: 'Kirim xolatini tanlang' }); return; }
    if (summaNum <= 0) { setMsg({ ok: false, text: "Summa 0 dan katta bo'lishi kerak" }); return; }
    if (showKurs && kursNum <= 0) { setMsg({ ok: false, text: 'Kursni kiriting' }); return; }
    setBusy(true);
    try {
      const body: Record<string, unknown> = { tur: op, sana: f.sana, summa: summaNum, izoh: f.izoh.trim() || undefined };
      if (showFrom) body.from = f.from;
      if (showTo) body.to = f.to;
      if (showKurs) body.kurs = kursNum;
      const r = await fetch('/api/avia/turizm/kassa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ ok: false, text: d.error || 'Xatolik' }); return; }
      setMsg({ ok: true, text: 'Saqlandi' });
      setF((p) => ({ ...p, summa: '', kurs: '', izoh: '' }));
      await onDone();
    } catch { setMsg({ ok: false, text: "Serverga ulanib bo'lmadi" }); }
    finally { setBusy(false); }
  };

  const inp: React.CSSProperties = { backgroundColor: C.bg, border: `1px solid ${C.line}`, color: '#fff', padding: '9px 11px', borderRadius: 8, fontSize: 13.5, outline: 'none', width: '100%' };
  const lbl: React.CSSProperties = { color: C.mut, fontSize: 11.5, fontWeight: 600, marginBottom: 5, display: 'block' };

  return (
    <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
      {/* Operatsiya tanlash */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {OP_META.filter((o) => o.key !== 'boshlangich' || isAdmin).map((o) => {
          const active = op === o.key;
          return (
            <button key={o.key} onClick={() => { setOp(o.key); setF((p) => ({ ...p, from: '', to: '' })); setMsg(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700, border: `1px solid ${active ? C.teal : C.line}`, backgroundColor: active ? C.teal + '18' : C.bg, color: active ? C.teal : C.mut }}>
              {o.icon} {o.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <div>
          <label style={lbl}>Sana</label>
          <input type="date" value={f.sana} onChange={(e) => setF({ ...f, sana: e.target.value })} style={inp} />
        </div>
        {showFrom && (
          <div>
            <label style={lbl}>{op === 'inkassatsiya' ? 'Qaysi naqd xolatdan' : 'Chiqim xolati'}</label>
            <select value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, to: '' })} style={inp}>
              <option value="">— tanlang —</option>
              {fromOpts.map((h) => <option key={h} value={h}>{TURIZM_HISOB_LABEL[h]}</option>)}
            </select>
          </div>
        )}
        {showTo && (
          <div>
            <label style={lbl}>Kirim xolati</label>
            <select value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} style={inp} disabled={op === 'perevod' && !f.from}>
              <option value="">— tanlang —</option>
              {toOpts.map((h) => <option key={h} value={h}>{TURIZM_HISOB_LABEL[h]}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={lbl}>{op === 'obmen' ? 'USD summa' : 'Summa'}</label>
          <input inputMode="numeric" value={f.summa} onChange={(e) => setF({ ...f, summa: e.target.value })} placeholder="0" style={{ ...inp, textAlign: 'right', fontFamily: 'var(--font-geist-mono)' }} />
        </div>
        {showKurs && (
          <div>
            <label style={lbl}>Kurs (so‘mga)</label>
            <input inputMode="numeric" value={f.kurs} onChange={(e) => setF({ ...f, kurs: e.target.value })} placeholder="12800" style={{ ...inp, textAlign: 'right', fontFamily: 'var(--font-geist-mono)' }} />
            {uzsPreview > 0 && <div style={{ color: C.teal, fontSize: 11.5, marginTop: 4 }}>= {fmt(uzsPreview)} so‘m</div>}
          </div>
        )}
        <div style={{ gridColumn: showKurs ? 'auto' : '1 / -1' }}>
          <label style={lbl}>Izoh</label>
          <input value={f.izoh} onChange={(e) => setF({ ...f, izoh: e.target.value })} placeholder="izoh (ixtiyoriy)" style={inp} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <button onClick={submit} disabled={busy}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 9, border: `1px solid ${C.teal}`, backgroundColor: C.teal + '18', color: C.teal, fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
          {op === 'perevod' ? <ArrowLeftRight size={16} /> : op === 'obmen' ? <Repeat size={16} /> : op === 'inkassatsiya' ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
          {busy ? 'Saqlanmoqda…' : 'Saqlash'}
        </button>
        {msg && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: msg.ok ? C.green : C.red }}>
            {msg.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
