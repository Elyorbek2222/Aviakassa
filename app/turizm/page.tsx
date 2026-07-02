'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Globe, Plus, Calendar, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TURIZM_TUR_LABEL, type TurizmYozuv, type TurizmTur } from '@/types/avia';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = (n: number) => Math.round(n || 0).toLocaleString('en-US').replaceAll(',', ' ');
const todayISO = () => new Date().toISOString().slice(0, 10);

const OY_NOM: Record<string, string> = {
  '01': 'Yanvar', '02': 'Fevral', '03': 'Mart', '04': 'Aprel', '05': 'May', '06': 'Iyun',
  '07': 'Iyul', '08': 'Avgust', '09': 'Sentabr', '10': 'Oktabr', '11': 'Noyabr', '12': 'Dekabr',
};
const oyLabel = (oy: string) => (OY_NOM[oy.slice(5, 7)] ? `${OY_NOM[oy.slice(5, 7)]} ${oy.slice(0, 4)}` : oy);

const C = {
  card: '#141F19', line: '#1E2E24', mut: '#8A9A8F', dim: '#4A5C50',
  teal: '#22C7A9', green: '#7CFF4F', red: '#FF4444', orange: '#F5A623',
};

interface Ref { id: number; name: string }
interface RefsResp { error?: string; suppliers: Ref[]; currencies: Ref[]; cashboxes: Ref[]; forms: Ref[] }
interface ListResp { oy: string; yozuvlar: TurizmYozuv[] }

export default function TurizmPage() {
  const { data: auth } = useSWR<{ user?: { role?: string } }>('/api/avia/auth', fetcher, { revalidateOnFocus: false });
  const role = auth?.user?.role;
  const canUse = role === 'admin' || role === 'sardor';

  const { data: refs } = useSWR<RefsResp>('/api/avia/turizm/refs', fetcher, { revalidateOnFocus: false });
  const { data: months } = useSWR<{ oylar: string[] }>('/api/avia/turizm', fetcher, { revalidateOnFocus: false });

  const [selected, setSelected] = useState('');
  const activeOy = selected || todayISO().slice(0, 7);
  const oylar = useMemo(() => {
    const set = new Set(months?.oylar ?? []);
    set.add(activeOy); // joriy oy doim ko'rinsin
    return [...set].sort((a, b) => (a < b ? 1 : -1));
  }, [months, activeOy]);

  const { data: list, mutate } = useSWR<ListResp>(`/api/avia/turizm?oy=${activeOy}`, fetcher, { revalidateOnFocus: false });
  const rows = useMemo(() => list?.yozuvlar ?? [], [list]);

  const [f, setF] = useState({ sana: todayISO(), zayavka: '', tur: 'prixot' as TurizmTur, summa: '', currencyId: '', partnerId: '', cashId: '', formId: '', izoh: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Refs kelganda valyuta/kassa uchun birinchi variantni default qo'yamiz
  useEffect(() => {
    if (!refs) return;
    setF((p) => ({
      ...p,
      currencyId: p.currencyId || (refs.currencies[0]?.id ? String(refs.currencies[0].id) : ''),
      cashId: p.cashId || (refs.cashboxes[0]?.id ? String(refs.cashboxes[0].id) : ''),
    }));
  }, [refs]);

  const totals = useMemo(() => {
    let p = 0, r = 0;
    for (const y of rows) { if (y.tur === 'prixot') p += y.summa; else r += y.summa; }
    return { prixot: p, rasxod: r, sof: p - r };
  }, [rows]);

  const submit = async () => {
    setMsg(null);
    if (!f.zayavka.trim()) { setMsg({ ok: false, text: 'Zayavka nomerini kiriting' }); return; }
    const summaNum = Number(f.summa.replace(/\s/g, ''));
    if (!summaNum || summaNum <= 0) { setMsg({ ok: false, text: "Summa 0 dan katta bo'lishi kerak" }); return; }
    setBusy(true);
    try {
      const partner = refs?.suppliers.find((s) => String(s.id) === f.partnerId);
      const valyuta = refs?.currencies.find((c) => String(c.id) === f.currencyId)?.name;
      const res = await fetch('/api/avia/turizm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sana: f.sana, zayavka: f.zayavka.trim(), tur: f.tur, summa: summaNum,
          currencyId: f.currencyId || undefined, valyuta,
          partnerId: f.partnerId || undefined, partnerNomi: partner?.name,
          cashId: f.cashId || undefined, formId: f.formId || undefined,
          izoh: f.izoh.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: data.error || 'Xatolik' }); return; }
      setMsg({ ok: true, text: `Saqlandi va U-ON'ga yuborildi (zayavka ${f.zayavka.trim()})` });
      setF((p) => ({ ...p, zayavka: '', summa: '', izoh: '' }));
      await mutate();
    } catch {
      setMsg({ ok: false, text: "Serverga ulanib bo'lmadi" });
    } finally { setBusy(false); }
  };

  const inp: React.CSSProperties = { backgroundColor: '#0A0F0D', border: `1px solid ${C.line}`, color: '#fff', padding: '9px 11px', borderRadius: 8, fontSize: 13.5, outline: 'none', width: '100%' };
  const lbl: React.CSSProperties = { color: C.mut, fontSize: 11.5, fontWeight: 600, marginBottom: 5, display: 'block' };
  const th: React.CSSProperties = { padding: '9px 10px', textAlign: 'left', color: C.mut, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', borderBottom: `2px solid ${C.line}` };
  const td: React.CSSProperties = { padding: '8px 10px', fontSize: 12.5, borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap' };

  if (auth && !canUse) {
    return <div style={{ color: C.mut, padding: 30 }}>Bu bo‘lim uchun ruxsat yo‘q.</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Globe size={24} style={{ color: C.teal }} /> Turizm — SEM Travel
        </h1>
        <div style={{ color: C.dim, fontSize: 12, marginTop: 5 }}>
          Prixot/rasxod bir marta shu yerda kiritiladi — avtomatik U-ON CRM zayavkasiga yoziladi va hisobotda ko‘rinadi.
        </div>
      </div>

      {refs?.error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: C.orange + '14', border: `1px solid ${C.orange}40`, color: C.orange, borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
          <AlertTriangle size={16} /> {refs.error} — partnyor/valyuta ro‘yxatlari bo‘sh. Kalit qo‘shilgach ishlaydi.
        </div>
      )}

      {/* Kiritish formasi */}
      <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 18 }}>
        {/* Prixot/Rasxod tanlash */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['prixot', 'rasxod'] as TurizmTur[]).map((t) => {
            const active = f.tur === t;
            const col = t === 'prixot' ? C.green : C.red;
            return (
              <button key={t} onClick={() => setF({ ...f, tur: t })}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 9, cursor: 'pointer', fontSize: 14, fontWeight: 700, border: `1px solid ${active ? col : C.line}`, backgroundColor: active ? col + '18' : '#0A0F0D', color: active ? col : C.mut }}>
                {t === 'prixot' ? <TrendingUp size={17} /> : <TrendingDown size={17} />} {TURIZM_TUR_LABEL[t]}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label style={lbl}>Zayavka nomeri *</label>
            <input value={f.zayavka} onChange={(e) => setF({ ...f, zayavka: e.target.value })} placeholder="masalan 12345" style={{ ...inp, fontFamily: 'var(--font-geist-mono)' }} />
          </div>
          <div>
            <label style={lbl}>Summa *</label>
            <input inputMode="numeric" value={f.summa} onChange={(e) => setF({ ...f, summa: e.target.value })} placeholder="0" style={{ ...inp, textAlign: 'right', fontFamily: 'var(--font-geist-mono)' }} />
          </div>
          <div>
            <label style={lbl}>Valyuta</label>
            <select value={f.currencyId} onChange={(e) => setF({ ...f, currencyId: e.target.value })} style={inp}>
              {(refs?.currencies ?? []).length === 0 && <option value="">—</option>}
              {(refs?.currencies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Sana</label>
            <input type="date" value={f.sana} onChange={(e) => setF({ ...f, sana: e.target.value })} style={inp} />
          </div>
          <div>
            <label style={lbl}>Partnyor {f.tur === 'rasxod' ? '(chiqim uchun)' : '(ixtiyoriy)'}</label>
            <select value={f.partnerId} onChange={(e) => setF({ ...f, partnerId: e.target.value })} style={inp}>
              <option value="">— tanlanmagan —</option>
              {(refs?.suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Kassa</label>
            <select value={f.cashId} onChange={(e) => setF({ ...f, cashId: e.target.value })} style={inp}>
              <option value="">— standart —</option>
              {(refs?.cashboxes ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>To‘lov shakli</label>
            <select value={f.formId} onChange={(e) => setF({ ...f, formId: e.target.value })} style={inp}>
              <option value="">— tanlanmagan —</option>
              {(refs?.forms ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>Izoh</label>
            <input value={f.izoh} onChange={(e) => setF({ ...f, izoh: e.target.value })} placeholder="to'lov asosi / izoh" style={inp} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <button onClick={submit} disabled={busy}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 9, border: `1px solid ${C.teal}`, backgroundColor: C.teal + '18', color: C.teal, fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            <Plus size={16} /> {busy ? 'Yuborilmoqda…' : "Saqlash va U-ON'ga yuborish"}
          </button>
          {msg && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: msg.ok ? C.green : C.red }}>
              {msg.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {msg.text}
            </span>
          )}
        </div>
      </div>

      {/* Oy tanlagich */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <Calendar size={16} style={{ color: C.mut }} />
        {oylar.map((oy) => {
          const active = activeOy === oy;
          return (
            <button key={oy} onClick={() => setSelected(oy)}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: active ? 700 : 500, border: `1px solid ${active ? C.teal : C.line}`, backgroundColor: active ? C.teal + '18' : C.card, color: active ? C.teal : C.mut }}>
              {oyLabel(oy)}
            </button>
          );
        })}
      </div>

      {/* Xulosalar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <Kpi icon={<TrendingUp size={18} />} label="Prixot (kirim)" value={fmt(totals.prixot)} color={C.green} />
        <Kpi icon={<TrendingDown size={18} />} label="Rasxod (chiqim)" value={fmt(totals.rasxod)} color={C.red} />
        <Kpi icon={<Globe size={18} />} label="Sof (kirim − chiqim)" value={(totals.sof >= 0 ? '+' : '') + fmt(totals.sof)} color={totals.sof < 0 ? C.red : C.teal} />
      </div>

      {/* Ro'yxat */}
      <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ maxHeight: '55vh', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr>
                <th style={th}>Sana</th>
                <th style={th}>Zayavka</th>
                <th style={th}>Tur</th>
                <th style={{ ...th, textAlign: 'right' }}>Summa</th>
                <th style={th}>Partnyor</th>
                <th style={th}>Izoh</th>
                <th style={th}>Kim</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((y) => (
                <tr key={y.id}>
                  <td style={{ ...td, color: C.mut }}>{y.sana}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-geist-mono)', color: '#fff' }}>{y.zayavka}</td>
                  <td style={{ ...td, color: y.tur === 'prixot' ? C.green : C.red }}>{TURIZM_TUR_LABEL[y.tur]}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-geist-mono)', color: '#e6f0ea' }}>{fmt(y.summa)}{y.valyuta ? ` ${y.valyuta}` : ''}</td>
                  <td style={{ ...td, whiteSpace: 'normal', color: C.mut }}>{y.partnerNomi || '—'}</td>
                  <td style={{ ...td, whiteSpace: 'normal', color: C.dim }}>{y.izoh || ''}</td>
                  <td style={{ ...td, color: C.dim }}>{y.yaratdi}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>{list ? "Yozuv yo'q" : 'Yuklanmoqda…'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 12px', color: C.dim, fontSize: 11, borderTop: `1px solid ${C.line}` }}>
          {rows.length} yozuv · {oyLabel(activeOy)}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 180px' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: color + '18', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
        <div style={{ color: C.mut, fontSize: 11, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}
