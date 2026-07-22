'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Building2, Calendar, TrendingUp, TrendingDown, Wallet, Users, Plus, Pencil, Trash2, HandCoins, AlertTriangle, CheckCircle2, Eye,
} from 'lucide-react';
import {
  TURIZM_OTDEL_LABEL, TURIZM_OTDELLAR, TURIZM_HISOB_LABEL,
  type TurizmOtdel, type TurizmXodim,
} from '@/types/avia';
import { TURIZM_HISOBLAR, hisobValyuta } from '@/lib/turizm-kassa';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = (n: number) => Math.round(n || 0).toLocaleString('en-US').replaceAll(',', ' ');
const cur = (c: 'uzs' | 'usd', n: number) => (c === 'usd' ? `$${fmt(n)}` : `${fmt(n)} so'm`);
const todayISO = () => new Date().toISOString().slice(0, 10);

const OY_NOM: Record<string, string> = { '01': 'Yanvar', '02': 'Fevral', '03': 'Mart', '04': 'Aprel', '05': 'May', '06': 'Iyun', '07': 'Iyul', '08': 'Avgust', '09': 'Sentabr', '10': 'Oktabr', '11': 'Noyabr', '12': 'Dekabr' };
const oyLabel = (oy: string) => (OY_NOM[oy.slice(5, 7)] ? `${OY_NOM[oy.slice(5, 7)]} ${oy.slice(0, 4)}` : oy);

const C = { card: '#141F19', line: '#1E2E24', mut: '#8A9A8F', dim: '#4A5C50', bg: '#0A0F0D', teal: '#22C7A9', green: '#7CFF4F', red: '#FF4444', orange: '#F5A623', gold: '#E0C34A', purple: '#9B59B6' };

interface Val { uzs: number; usd: number }
interface FinResp { oy: string; daromad: Val; rasxod: Val; oylik: Val; sof: Val; oylikByOtdel: Record<string, Val>; reja: Val; rejaByOtdel: Record<string, Val> }
interface HisobDetail { zayavka: number; som: number; ulush: number; hissa: number }
interface OylikHisobRow { id: string; ism: string; otdel: TurizmOtdel; valyuta: 'uzs' | 'usd'; faol: boolean; linked: boolean; kpiFoiz: number; oklad: number; okladUsd: number; kpiBaza: number; kpi: number; jamiSom: number; tolanganSom: number; tolanganUsd: number; qoldiqSom: number; detail: HisobDetail[] }
interface OylikHisobResp { oy: string; xodimlar: OylikHisobRow[] }
interface UonRef { id: number; name: string }

const inp: React.CSSProperties = { backgroundColor: C.bg, border: `1px solid ${C.line}`, color: '#fff', padding: '9px 11px', borderRadius: 8, fontSize: 13.5, outline: 'none', width: '100%' };
const lbl: React.CSSProperties = { color: C.mut, fontSize: 11.5, fontWeight: 600, marginBottom: 5, display: 'block' };

export default function FinOtdelPage() {
  const { data: auth } = useSWR<{ user?: { role?: string } }>('/api/avia/auth', fetcher, { revalidateOnFocus: false });
  const role = auth?.user?.role;
  const canUse = role === 'admin' || role === 'sardor';

  const [oy, setOy] = useState(todayISO().slice(0, 7));
  const { data: fin } = useSWR<FinResp>(`/api/avia/turizm/fin?oy=${oy}`, fetcher, { revalidateOnFocus: false });
  const { data: xod, mutate: mutateXod } = useSWR<{ xodimlar: TurizmXodim[] }>('/api/avia/turizm/xodimlar', fetcher, { revalidateOnFocus: false });
  const { data: hisob, mutate: mutateHisob } = useSWR<OylikHisobResp>(`/api/avia/turizm/oylik-hisob?oy=${oy}`, fetcher, { revalidateOnFocus: false });
  const { data: refs } = useSWR<{ managers: UonRef[] }>('/api/avia/turizm/refs', fetcher, { revalidateOnFocus: false });

  const refresh = async () => { await Promise.all([mutateXod(), mutateHisob()]); };
  const xodimlar = useMemo(() => xod?.xodimlar ?? [], [xod]);
  const hisobById = useMemo(() => new Map((hisob?.xodimlar ?? []).map((h) => [h.id, h])), [hisob]);
  const managers = useMemo(() => refs?.managers ?? [], [refs]);

  const oylar = useMemo(() => {
    const set = new Set<string>([oy]);
    for (let i = 0; i < 6; i++) { const d = new Date(); d.setMonth(d.getMonth() - i); set.add(d.toISOString().slice(0, 7)); }
    return [...set].sort((a, b) => (a < b ? 1 : -1));
  }, [oy]);

  const [editing, setEditing] = useState<TurizmXodim | null>(null);
  const [paying, setPaying] = useState<TurizmXodim | null>(null);
  const [adding, setAdding] = useState(false);
  const [detailRow, setDetailRow] = useState<OylikHisobRow | null>(null);

  const delXodim = async (x: TurizmXodim) => {
    if (!confirm(`${x.ism} ro'yxatdan o'chirilsinmi? (to'lov tarixi qoladi)`)) return;
    const r = await fetch(`/api/avia/turizm/xodimlar?id=${encodeURIComponent(x.id)}`, { method: 'DELETE' });
    if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error || "Xatolik"); return; }
    await refresh();
  };

  if (auth && !canUse) return <div style={{ color: C.mut, padding: 30 }}>Bu bo‘lim uchun ruxsat yo‘q.</div>;

  const F = fin ?? { oy, daromad: { uzs: 0, usd: 0 }, rasxod: { uzs: 0, usd: 0 }, oylik: { uzs: 0, usd: 0 }, sof: { uzs: 0, usd: 0 }, oylikByOtdel: {}, reja: { uzs: 0, usd: 0 }, rejaByOtdel: {} };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Building2 size={24} style={{ color: C.teal }} /> Fin Otdel — oylik hisob
        </h1>
        <div style={{ color: C.dim, fontSize: 12, marginTop: 5 }}>
          Oyiga daromad, rasxod va oyliklar — sof foyda. Xodimlar bo‘limlar bo‘yicha fiks oylik. (So‘m/USD alohida.)
        </div>
      </div>

      {/* Oy tanlash */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <Calendar size={16} style={{ color: C.mut }} />
        {oylar.map((m) => (
          <button key={m} onClick={() => setOy(m)}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: oy === m ? 700 : 500, border: `1px solid ${oy === m ? C.teal : C.line}`, backgroundColor: oy === m ? C.teal + '18' : C.card, color: oy === m ? C.teal : C.mut }}>
            {oyLabel(m)}
          </button>
        ))}
      </div>

      {/* P&L kartalari */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 18 }}>
        <PnlCard icon={<TrendingUp size={18} />} label="Daromad (prixot)" v={F.daromad} color={C.green} />
        <PnlCard icon={<TrendingDown size={18} />} label="Partnyor rasxod" v={F.rasxod} color={C.orange} />
        <PnlCard icon={<Users size={18} />} label="Oyliklar (to‘langan)" v={F.oylik} color={C.purple} />
        <PnlCard icon={<Wallet size={18} />} label="Sof foyda" v={F.sof} color={C.teal} sof />
      </div>

      {/* Bo'lim bo'yicha oyliklar (reja ↔ to'langan) */}
      <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 18 }}>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={16} style={{ color: C.mut }} /> Bo‘limlar bo‘yicha oylik
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {TURIZM_OTDELLAR.map((od) => {
            const reja = F.rejaByOtdel[od] ?? { uzs: 0, usd: 0 };
            const paid = F.oylikByOtdel[od] ?? { uzs: 0, usd: 0 };
            return (
              <div key={od} style={{ backgroundColor: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12 }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{TURIZM_OTDEL_LABEL[od]}</div>
                <Row2 label="Reja" v={reja} />
                <Row2 label="To‘langan" v={paid} accent={C.green} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Xodimlar ro'yxati + to'lash */}
      <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} style={{ color: C.mut }} /> Xodimlar
          </div>
          <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 8, border: `1px solid ${C.teal}`, backgroundColor: C.teal + '18', color: C.teal, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={15} /> Yangi xodim
          </button>
        </div>

        {TURIZM_OTDELLAR.map((od) => {
          const list = xodimlar.filter((x) => x.otdel === od);
          if (list.length === 0) return null;
          return (
            <div key={od} style={{ marginBottom: 14 }}>
              <div style={{ color: C.mut, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{TURIZM_OTDEL_LABEL[od]}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {list.map((x) => {
                  const h = hisobById.get(x.id);
                  const okladSom = x.valyuta === 'uzs' ? x.oylik : 0;
                  const kpi = h?.kpi ?? 0;
                  const kpiBaza = h?.kpiBaza ?? 0;
                  const jamiSom = h?.jamiSom ?? okladSom + kpi;
                  const tolanganSom = h?.tolanganSom ?? 0;
                  const qoldiqSom = h?.qoldiqSom ?? jamiSom - tolanganSom;
                  return (
                    <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', backgroundColor: C.bg, border: `1px solid ${C.line}`, borderRadius: 9, padding: '9px 12px' }}>
                      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                        <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 600 }}>{x.ism}{!x.faol && <span style={{ color: C.dim, fontWeight: 400 }}> · faol emas</span>}</div>
                        <div style={{ color: C.dim, fontSize: 11 }}>
                          Oklad: {cur(x.valyuta, x.oylik)}{x.kpiFoiz ? ` · KPI ${x.kpiFoiz}%` : ''}
                          {!x.uonManagerId && <span style={{ color: C.orange }}> · U-ON ulanmagan</span>}
                        </div>
                      </div>
                      <Metric label="KPI baza" value={fmt(kpiBaza)} />
                      <Metric label="KPI" value={fmt(kpi)} color={C.purple} />
                      <Metric label="Jami so‘m" value={fmt(jamiSom)} />
                      <Metric label="To‘langan" value={fmt(tolanganSom)} color={C.green} />
                      <Metric label="Qoldiq" value={fmt(qoldiqSom)} color={qoldiqSom > 0 ? C.orange : C.dim} />
                      <div style={{ display: 'flex', gap: 5 }}>
                        {h && h.detail.length > 0 && <button onClick={() => setDetailRow(h)} title="Zayavkalar (KPI tafsiloti)" style={iconBtn(C.teal)}><Eye size={14} /></button>}
                        <button onClick={() => setPaying(x)} title="Oylik to'lash" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: `1px solid ${C.green}`, backgroundColor: C.green + '14', color: C.green, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}><HandCoins size={14} /> To‘lash</button>
                        <button onClick={() => setEditing(x)} title="Tahrirlash" style={iconBtn(C.orange)}><Pencil size={14} /></button>
                        <button onClick={() => delXodim(x)} title="O'chirish" style={iconBtn(C.red)}><Trash2 size={14} /></button>
                      </div>
                      {x.valyuta === 'usd' && <div style={{ flexBasis: '100%', color: C.dim, fontSize: 11 }}>USD oklad ${fmt(x.oylik)} — so‘m KPI‘ga qo‘shilmaydi (alohida to‘lanadi)</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {xodimlar.length === 0 && <div style={{ color: C.dim, fontSize: 13, padding: '16px 0', textAlign: 'center' }}>{xod ? "Xodim yo'q — «Yangi xodim» tugmasi bilan qo'shing" : 'Yuklanmoqda…'}</div>}
      </div>

      {adding && <XodimModal managers={managers} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await refresh(); }} />}
      {editing && <XodimModal x={editing} managers={managers} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refresh(); }} />}
      {paying && <PayModal x={paying} oy={oy} onClose={() => setPaying(null)} onSaved={async () => { setPaying(null); await refresh(); }} />}
      {detailRow && <DetailModal row={detailRow} oy={oy} onClose={() => setDetailRow(null)} onChanged={async () => { await mutateHisob(); }} />}
    </div>
  );
}

function PnlCard({ icon, label, v, color, sof }: { icon: React.ReactNode; label: string; v: Val; color: string; sof?: boolean }) {
  const c = (n: number) => (sof && n < 0 ? C.red : color);
  return (
    <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: C.mut, fontSize: 12 }}>
        <span style={{ color }}>{icon}</span> {label}
      </div>
      <div style={{ color: c(v.uzs), fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{fmt(v.uzs)} so‘m</div>
      <div style={{ color: c(v.usd), fontSize: 14, fontWeight: 700, marginTop: 2 }}>${fmt(v.usd)}</div>
    </div>
  );
}

function Row2({ label, v, accent }: { label: string; v: Val; accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 3 }}>
      <span style={{ color: C.mut }}>{label}</span>
      <span style={{ color: accent || '#e6f0ea' }}>{fmt(v.uzs)} · ${fmt(v.usd)}</span>
    </div>
  );
}

const iconBtn = (col: string): React.CSSProperties => ({ display: 'inline-flex', padding: 6, borderRadius: 7, border: `1px solid ${C.line}`, backgroundColor: 'transparent', color: col, cursor: 'pointer' });

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'right', minWidth: 62 }}>
      <div style={{ color: color || '#e6f0ea', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-geist-mono)' }}>{value}</div>
      <div style={{ color: C.dim, fontSize: 10 }}>{label}</div>
    </div>
  );
}

// ===== Xodim qo'shish/tahrirlash =====
function XodimModal({ x, managers, onClose, onSaved }: { x?: TurizmXodim; managers: UonRef[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    ism: x?.ism || '', otdel: (x?.otdel || 'menejerlar') as TurizmOtdel,
    oylik: x ? String(x.oylik) : '', valyuta: (x?.valyuta || 'uzs') as 'uzs' | 'usd',
    faol: x ? x.faol : true,
    uonManagerId: x?.uonManagerId ? String(x.uonManagerId) : '',
    kpiFoiz: x?.kpiFoiz != null ? String(x.kpiFoiz) : '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const oylikNum = Number(String(f.oylik).replace(/\s/g, '')) || 0;

  const save = async () => {
    setErr('');
    if (!f.ism.trim()) { setErr('Ism kiriting'); return; }
    if (oylikNum < 0) { setErr("Oylik noto'g'ri"); return; }
    setBusy(true);
    try {
      const body = {
        id: x?.id, ism: f.ism.trim(), otdel: f.otdel, oylik: oylikNum, valyuta: f.valyuta, faol: f.faol,
        uonManagerId: f.uonManagerId ? Number(f.uonManagerId) : null,
        kpiFoiz: f.kpiFoiz !== '' ? Number(f.kpiFoiz) : null,
      };
      const r = await fetch('/api/avia/turizm/xodimlar', { method: x ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error || 'Xatolik'); return; }
      onSaved();
    } catch { setErr("Serverga ulanib bo'lmadi"); } finally { setBusy(false); }
  };

  return (
    <Modal title={x ? 'Xodimni tahrirlash' : 'Yangi xodim'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Ism *</label><input value={f.ism} onChange={(e) => setF({ ...f, ism: e.target.value })} style={inp} /></div>
        <div><label style={lbl}>Bo‘lim</label>
          <select value={f.otdel} onChange={(e) => setF({ ...f, otdel: e.target.value as TurizmOtdel })} style={inp}>
            {TURIZM_OTDELLAR.map((o) => <option key={o} value={o}>{TURIZM_OTDEL_LABEL[o]}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Valyuta</label>
          <select value={f.valyuta} onChange={(e) => setF({ ...f, valyuta: e.target.value as 'uzs' | 'usd' })} style={inp}>
            <option value="uzs">So‘m (UZS)</option><option value="usd">Dollar (USD)</option>
          </select>
        </div>
        <div><label style={lbl}>Oklad (fiks oylik)</label><input inputMode="numeric" value={f.oylik} onChange={(e) => setF({ ...f, oylik: e.target.value })} placeholder="0" style={{ ...inp, textAlign: 'right', fontFamily: 'var(--font-geist-mono)' }} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>U-ON menejer <span style={{ color: C.dim, fontWeight: 400 }}>(KPI shu menejer zayavkalaridan)</span></label>
          <select value={f.uonManagerId} onChange={(e) => setF({ ...f, uonManagerId: e.target.value })} style={inp}>
            <option value="">— yo‘q (KPI hisoblanmaydi) —</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>)}
          </select>
        </div>
        <div><label style={lbl}>Shaxsiy KPI %</label><input inputMode="decimal" value={f.kpiFoiz} onChange={(e) => setF({ ...f, kpiFoiz: e.target.value })} placeholder="masalan 3" style={{ ...inp, textAlign: 'right', fontFamily: 'var(--font-geist-mono)' }} /></div>
        {x && (
          <div><label style={lbl}>Holat</label>
            <select value={f.faol ? '1' : '0'} onChange={(e) => setF({ ...f, faol: e.target.value === '1' })} style={inp}>
              <option value="1">Faol</option><option value="0">Faol emas</option>
            </select>
          </div>
        )}
      </div>
      {err && <div style={{ color: C.red, fontSize: 12.5, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {err}</div>}
      <ModalButtons busy={busy} onClose={onClose} onSave={save} />
    </Modal>
  );
}

// KPI tafsiloti — menejer zayavkalari + ulush % (qo'lда tahrirlanadi)
function DetailModal({ row, oy, onClose, onChanged }: { row: OylikHisobRow; oy: string; onClose: () => void; onChanged: () => Promise<void> }) {
  const [ulush, setUlush] = useState<Record<number, number>>(() => Object.fromEntries(row.detail.map((d) => [d.zayavka, d.ulush])));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  const getU = (rId: number) => ulush[rId] ?? 100;
  const hissaOf = (d: HisobDetail) => Math.round((d.som * getU(d.zayavka)) / 100);
  const kpiBaza = row.detail.reduce((s, d) => s + hissaOf(d), 0);
  const kpi = Math.round((kpiBaza * row.kpiFoiz) / 100);

  const saveU = async (rId: number, val: number) => {
    const v = Math.max(0, Math.min(100, Math.round(val) || 0));
    if (v === getU(rId)) return;
    setUlush((p) => ({ ...p, [rId]: v }));
    setSaving(rId);
    try {
      await fetch('/api/avia/turizm/ulush', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rId, ulush: v }) });
      setDirty(true);
    } finally { setSaving(null); }
  };
  const close = async () => { if (dirty) await onChanged(); onClose(); };

  const dth: React.CSSProperties = { padding: '7px 10px', color: C.mut, fontSize: 11, fontWeight: 600, borderBottom: `1px solid ${C.line}`, position: 'sticky', top: 0, backgroundColor: C.card };
  const dtd: React.CSSProperties = { padding: '6px 10px', fontSize: 12.5, borderBottom: `1px solid ${C.line}` };

  return (
    <Modal title={`KPI tafsiloti — ${row.ism}`} onClose={close}>
      <div style={{ color: C.dim, fontSize: 12, marginBottom: 10 }}>
        {oyLabel(oy)} · pul tushgan zayavkalar · ulushni o‘zgartirsangiz KPI qayta hisoblanadi (avtosaqlanadi)
      </div>
      <div style={{ maxHeight: '46vh', overflow: 'auto', border: `1px solid ${C.line}`, borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={{ ...dth, textAlign: 'left' }}>Zayavka</th>
            <th style={{ ...dth, textAlign: 'right' }}>Tushgan (so‘m)</th>
            <th style={{ ...dth, textAlign: 'center', width: 84 }}>Ulush %</th>
            <th style={{ ...dth, textAlign: 'right' }}>KPI hissa</th>
          </tr></thead>
          <tbody>
            {row.detail.map((d) => (
              <tr key={d.zayavka}>
                <td style={{ ...dtd, fontFamily: 'var(--font-geist-mono)', color: '#fff' }}>#{d.zayavka}</td>
                <td style={{ ...dtd, textAlign: 'right', fontFamily: 'var(--font-geist-mono)' }}>{fmt(d.som)}</td>
                <td style={{ ...dtd, textAlign: 'center' }}>
                  <input inputMode="numeric" defaultValue={getU(d.zayavka)}
                    onBlur={(e) => saveU(d.zayavka, Number(e.target.value))}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    style={{ width: 58, textAlign: 'center', backgroundColor: C.bg, border: `1px solid ${saving === d.zayavka ? C.teal : C.line}`, color: '#fff', padding: '5px 6px', borderRadius: 6, fontSize: 12.5, fontFamily: 'var(--font-geist-mono)' }} />
                </td>
                <td style={{ ...dtd, textAlign: 'right', fontFamily: 'var(--font-geist-mono)', color: C.purple }}>{fmt(hissaOf(d))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13 }}>
        <span style={{ color: C.mut }}>KPI baza → KPI ({row.kpiFoiz}%)</span>
        <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'var(--font-geist-mono)' }}>{fmt(kpiBaza)} → <span style={{ color: C.purple }}>{fmt(kpi)}</span> so‘m</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <button onClick={close} style={{ padding: '9px 18px', borderRadius: 9, border: `1px solid ${C.teal}`, backgroundColor: C.teal + '18', color: C.teal, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Yopish</button>
      </div>
    </Modal>
  );
}

// ===== Oylik to'lash =====
function PayModal({ x, oy, onClose, onSaved }: { x: TurizmXodim; oy: string; onClose: () => void; onSaved: () => void }) {
  const hisoblar = TURIZM_HISOBLAR.filter((h) => hisobValyuta(h) === x.valyuta);
  const [f, setF] = useState({ from: (hisoblar[0] ?? '') as string, summa: String(x.oylik), sana: todayISO(), izoh: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const summaNum = Number(String(f.summa).replace(/\s/g, '')) || 0;

  const save = async () => {
    setErr('');
    if (!f.from) { setErr('Xolat tanlang'); return; }
    if (summaNum <= 0) { setErr("Summa 0 dan katta bo'lishi kerak"); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/avia/turizm/kassa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tur: 'oylik', from: f.from, summa: summaNum, sana: f.sana, xodim: x.ism, xodimId: x.id, otdel: x.otdel, izoh: f.izoh.trim() || `Oylik ${oyLabel(oy)}` }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error || 'Xatolik'); return; }
      onSaved();
    } catch { setErr("Serverga ulanib bo'lmadi"); } finally { setBusy(false); }
  };

  return (
    <Modal title={`Oylik to‘lash — ${x.ism}`} onClose={onClose}>
      <div style={{ color: C.dim, fontSize: 12, marginBottom: 10 }}>Bo‘lim: {TURIZM_OTDEL_LABEL[x.otdel]} · Fiks: {cur(x.valyuta, x.oylik)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <div><label style={lbl}>Qaysi xolatdan</label>
          <select value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} style={inp}>
            {hisoblar.map((h) => <option key={h} value={h}>{TURIZM_HISOB_LABEL[h]}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Summa ({x.valyuta.toUpperCase()})</label><input inputMode="numeric" value={f.summa} onChange={(e) => setF({ ...f, summa: e.target.value })} style={{ ...inp, textAlign: 'right', fontFamily: 'var(--font-geist-mono)' }} /></div>
        <div><label style={lbl}>Sana</label><input type="date" value={f.sana} onChange={(e) => setF({ ...f, sana: e.target.value })} style={inp} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Izoh</label><input value={f.izoh} onChange={(e) => setF({ ...f, izoh: e.target.value })} placeholder={`Oylik ${oyLabel(oy)}`} style={inp} /></div>
      </div>
      {err && <div style={{ color: C.red, fontSize: 12.5, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {err}</div>}
      <ModalButtons busy={busy} onClose={onClose} onSave={save} saveLabel="To‘lash" />
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: '#000A', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, zIndex: 50, overflow: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, width: '100%', maxWidth: 520, marginTop: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.mut, cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalButtons({ busy, onClose, onSave, saveLabel = 'Saqlash' }: { busy: boolean; onClose: () => void; onSave: () => void; saveLabel?: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
      <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 9, border: `1px solid ${C.line}`, backgroundColor: 'transparent', color: C.mut, fontSize: 13.5, cursor: 'pointer' }}>Bekor</button>
      <button onClick={onSave} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 9, border: `1px solid ${C.teal}`, backgroundColor: C.teal + '18', color: C.teal, fontSize: 13.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Saqlanmoqda…' : <><CheckCircle2 size={15} /> {saveLabel}</>}
      </button>
    </div>
  );
}
