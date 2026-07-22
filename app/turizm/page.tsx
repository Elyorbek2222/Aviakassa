'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Globe, Plus, Calendar, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Printer, Pencil, Trash2 } from 'lucide-react';
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
interface ZService { name: string; price: number; currency: string; kurs: number; dateBegin?: string; dateEnd?: string; partner?: string }
interface ZInfo { rId: number; nomer: string; mijoz: string; manager: string; status: string; xizmatlar: ZService[]; sell: number; clientPaid: number; clientDebt: number; currencyId: number; kurs: number; valyuta: string }

// So'm valyutasi (kurs shart emas)
const isSom = (name?: string) => !name || /сум|so'?m|uzs/i.test(name);

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

  const [f, setF] = useState({ sana: todayISO(), zayavka: '', tur: 'prixot' as TurizmTur, summa: '', kurs: '', currencyId: '', partnerId: '', cashId: '', formId: '', izoh: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saved, setSaved] = useState<TurizmYozuv | null>(null); // oxirgi saqlangan (chek uchun)
  const [editing, setEditing] = useState<TurizmYozuv | null>(null); // tahrirlash oynasi

  // Zayavka lookup — mijoz + uslugalarni ko'rsatish
  const [zInfo, setZInfo] = useState<ZInfo | null>(null);
  const [zLoading, setZLoading] = useState(false);
  const [zErr, setZErr] = useState('');

  const lookupZayavka = async () => {
    const nomer = f.zayavka.trim();
    setZErr('');
    if (!nomer) { setZInfo(null); return; }
    setZLoading(true);
    try {
      const r = await fetch(`/api/avia/turizm/zayavka?nomer=${encodeURIComponent(nomer)}`);
      const d = await r.json();
      if (!r.ok) { setZInfo(null); setZErr(d.error || 'Topilmadi'); return; }
      const info = d.info as ZInfo;
      setZInfo(info);
      // Ishlash oson: prixotда zayavkadan valyuta + kurs + summani avtomat qo'yamiz
      // (o'zgartirsa bo'ladi). Kurs uslugalardan (service.rate) olinadi.
      if (f.tur === 'prixot') {
        setF((p) => {
          const next = { ...p };
          if (info.currencyId) next.currencyId = String(info.currencyId);
          if (info.kurs > 0) next.kurs = String(info.kurs);
          if (!p.summa.trim() && info.clientDebt > 0) {
            next.summa = info.kurs > 0
              ? String(Math.round(info.clientDebt / info.kurs)) // USD zayavka — qarz dollarda
              : String(Math.round(info.clientDebt));            // so'm zayavka
          }
          return next;
        });
      }
    } catch { setZErr("Serverga ulanib bo'lmadi"); }
    finally { setZLoading(false); }
  };

  const curName = refs?.currencies.find((c) => String(c.id) === f.currencyId)?.name;
  const needKurs = !isSom(curName);
  const summaNum = Number(f.summa.replace(/\s/g, '')) || 0;
  const kursNum = Number(f.kurs) || 0;
  const uzsPreview = needKurs ? (kursNum ? Math.round(summaNum * kursNum) : 0) : summaNum;

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
    if (!summaNum || summaNum <= 0) { setMsg({ ok: false, text: "Summa 0 dan katta bo'lishi kerak" }); return; }
    if (needKurs && kursNum <= 0) { setMsg({ ok: false, text: 'Valyuta so’mdan boshqa — kursni kiriting' }); return; }
    setBusy(true);
    try {
      const partner = refs?.suppliers.find((s) => String(s.id) === f.partnerId);
      const valyuta = curName;
      const xizmat = zInfo?.xizmatlar.map((x) => x.name).filter(Boolean).join(', ') || undefined;
      const res = await fetch('/api/avia/turizm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sana: f.sana, zayavka: f.zayavka.trim(), tur: f.tur, summa: summaNum,
          kurs: needKurs && kursNum ? kursNum : undefined,
          mijoz: zInfo?.mijoz, xizmat,
          currencyId: f.currencyId || undefined, valyuta,
          partnerId: f.partnerId || undefined, partnerNomi: partner?.name,
          cashId: f.cashId || undefined, formId: f.formId || undefined,
          izoh: f.izoh.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: data.error || 'Xatolik' }); return; }
      setSaved(data.yozuv as TurizmYozuv);
      setMsg({ ok: true, text: `Saqlandi va U-ON'ga yuborildi (zayavka ${f.zayavka.trim()})` });
      setF((p) => ({ ...p, zayavka: '', summa: '', kurs: '', izoh: '' }));
      setZInfo(null); setZErr('');
      await mutate();
    } catch {
      setMsg({ ok: false, text: "Serverga ulanib bo'lmadi" });
    } finally { setBusy(false); }
  };

  // Tahrirlash/o'chirish ruxsati: admin — doim; sardor — id'dagi vaqtdan 48 soat ichida.
  const createdMs = (id: string) => { const m = /^[A-Z]+-(\d{10,})-/.exec(id); return m ? Number(m[1]) : 0; };
  const canModify = (y: TurizmYozuv) => role === 'admin' || (createdMs(y.id) > 0 && Date.now() - createdMs(y.id) < 48 * 3600 * 1000);

  const delRow = async (y: TurizmYozuv) => {
    if (!confirm(`${TURIZM_TUR_LABEL[y.tur]} — ${fmt(y.summa)}${y.valyuta ? ' ' + y.valyuta : ''} (zayavka ${y.zayavka}) o'chirilsinmi?\nU-ON'dan ham o'chadi.`)) return;
    const r = await fetch(`/api/avia/turizm?oy=${activeOy}&id=${encodeURIComponent(y.id)}`, { method: 'DELETE' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { alert(d.error || "O'chirishda xatolik"); return; }
    await mutate();
  };

  const inp: React.CSSProperties = { backgroundColor: '#0A0F0D', border: `1px solid ${C.line}`, color: '#fff', padding: '9px 11px', borderRadius: 8, fontSize: 13.5, outline: 'none', width: '100%' };
  const lbl: React.CSSProperties = { color: C.mut, fontSize: 11.5, fontWeight: 600, marginBottom: 5, display: 'block' };
  const th: React.CSSProperties = { padding: '9px 10px', textAlign: 'left', color: C.mut, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', borderBottom: `2px solid ${C.line}` };
  const td: React.CSSProperties = { padding: '8px 10px', fontSize: 12.5, borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap' };
  const actBtn = (col: string): React.CSSProperties => ({ display: 'inline-flex', padding: 5, borderRadius: 6, border: `1px solid ${C.line}`, backgroundColor: 'transparent', color: col, cursor: 'pointer' });

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
            <input value={f.zayavka}
              onChange={(e) => { setF({ ...f, zayavka: e.target.value }); if (zInfo || zErr) { setZInfo(null); setZErr(''); } }}
              onBlur={lookupZayavka}
              onKeyDown={(e) => { if (e.key === 'Enter') lookupZayavka(); }}
              placeholder="masalan 12345" style={{ ...inp, fontFamily: 'var(--font-geist-mono)' }} />
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
          {needKurs && (
            <div>
              <label style={lbl}>Kurs * <span style={{ color: C.dim, fontWeight: 400 }}>(so‘mga)</span></label>
              <input inputMode="numeric" value={f.kurs} onChange={(e) => setF({ ...f, kurs: e.target.value })} placeholder="12800" style={{ ...inp, textAlign: 'right', fontFamily: 'var(--font-geist-mono)' }} />
              {uzsPreview > 0 && <div style={{ color: C.teal, fontSize: 11.5, marginTop: 4 }}>= {fmt(uzsPreview)} so‘m</div>}
            </div>
          )}
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

        {/* Zayavka ma'lumoti — mijoz + uslugalar */}
        {(zLoading || zErr || zInfo) && (
          <div style={{ marginTop: 12, backgroundColor: '#0A0F0D', border: `1px solid ${zErr ? C.orange + '55' : C.line}`, borderRadius: 10, padding: '11px 13px' }}>
            {zLoading && <span style={{ color: C.mut, fontSize: 12.5 }}>Zayavka tekshirilmoqda…</span>}
            {zErr && !zLoading && <span style={{ color: C.orange, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {zErr}</span>}
            {zInfo && !zLoading && (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12.5, marginBottom: zInfo.xizmatlar.length ? 8 : 0 }}>
                  <span style={{ color: C.mut }}>Mijoz: <b style={{ color: '#fff' }}>{zInfo.mijoz || '—'}</b></span>
                  {zInfo.status && <span style={{ color: C.mut }}>Holat: <b style={{ color: C.teal }}>{zInfo.status}</b></span>}
                  {zInfo.sell > 0 && <span style={{ color: C.mut }}>Sotuv: <b style={{ color: '#fff' }}>{fmt(zInfo.sell)}</b></span>}
                  {zInfo.clientDebt > 0 && <span style={{ color: C.mut }}>Mijoz qarzi: <b style={{ color: C.orange }}>{fmt(zInfo.clientDebt)}</b></span>}
                  {zInfo.kurs > 0 && <span style={{ color: C.mut }}>Valyuta: <b style={{ color: C.teal }}>{zInfo.valyuta}</b> · Kurs: <b style={{ color: '#fff' }}>{fmt(zInfo.kurs)}</b></span>}
                </div>
                {zInfo.xizmatlar.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {zInfo.xizmatlar.map((x, i) => (
                      <span key={i} style={{ fontSize: 11.5, color: '#cfe', backgroundColor: C.teal + '14', border: `1px solid ${C.teal}30`, borderRadius: 6, padding: '3px 8px' }}>
                        {x.name}
                        {x.dateBegin ? ` · ${x.dateBegin}${x.dateEnd && x.dateEnd !== x.dateBegin ? '→' + x.dateEnd : ''}` : ''}
                        {x.price > 0 ? ` · ${fmt(x.price)}${x.currency ? ' ' + x.currency : ''}` : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: C.dim }}>Uslugalar ko‘rsatilmagan</div>
                )}
              </div>
            )}
          </div>
        )}

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
          {saved && saved.tur === 'prixot' && (
            <button onClick={() => printChek(saved)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 9, border: `1px solid ${C.green}`, backgroundColor: C.green + '14', color: C.green, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
              <Printer size={15} /> Chek chiqarish
            </button>
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
                <th style={{ ...th, textAlign: 'center' }}>Amal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((y) => (
                <tr key={y.id}>
                  <td style={{ ...td, color: C.mut }}>{y.sana}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-geist-mono)', color: '#fff' }}>{y.zayavka}</td>
                  <td style={{ ...td, color: y.tur === 'prixot' ? C.green : C.red }}>{TURIZM_TUR_LABEL[y.tur]}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-geist-mono)', color: '#e6f0ea' }}>
                    {fmt(y.summa)}{y.valyuta ? ` ${y.valyuta}` : ''}
                    {y.kurs ? <div style={{ color: C.dim, fontSize: 10.5 }}>×{fmt(y.kurs)} = {fmt(y.summaUzs ?? y.summa)} so‘m</div> : null}
                  </td>
                  <td style={{ ...td, whiteSpace: 'normal', color: C.mut }}>{y.partnerNomi || '—'}</td>
                  <td style={{ ...td, whiteSpace: 'normal', color: C.dim }}>{y.izoh || ''}</td>
                  <td style={{ ...td, color: C.dim }}>{y.yaratdi}</td>
                  <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: 5 }}>
                      {y.tur === 'prixot' && (
                        <button onClick={() => printChek(y)} title="Kassa cheki" style={actBtn(C.teal)}><Printer size={14} /></button>
                      )}
                      {canModify(y) && (
                        <>
                          <button onClick={() => setEditing(y)} title="Tahrirlash" style={actBtn(C.orange)}><Pencil size={14} /></button>
                          <button onClick={() => delRow(y)} title="O'chirish" style={actBtn(C.red)}><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>{list ? "Yozuv yo'q" : 'Yuklanmoqda…'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 12px', color: C.dim, fontSize: 11, borderTop: `1px solid ${C.line}` }}>
          {rows.length} yozuv · {oyLabel(activeOy)}
        </div>
      </div>

      {editing && refs && (
        <EditTurizmModal y={editing} oy={activeOy} refs={refs} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await mutate(); }} />
      )}
    </div>
  );
}

// Yozuvni tahrirlash oynasi. U-ON'da payment/update yo'q → server eski to'lovni
// o'chirib, yangisini yaratadi (delete + create).
function EditTurizmModal({ y, oy, refs, onClose, onSaved }: { y: TurizmYozuv; oy: string; refs: RefsResp; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    tur: y.tur as TurizmTur,
    sana: y.sana,
    summa: String(y.summa),
    kurs: y.kurs ? String(y.kurs) : '',
    currencyId: y.currencyId ? String(y.currencyId) : (refs.currencies[0]?.id ? String(refs.currencies[0].id) : ''),
    partnerId: y.partnerId ? String(y.partnerId) : '',
    cashId: y.cashId ? String(y.cashId) : '',
    formId: y.formId ? String(y.formId) : '',
    izoh: y.izoh || '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const curName = refs.currencies.find((c) => String(c.id) === f.currencyId)?.name;
  const needKurs = !isSom(curName);
  const summaNum = Number(f.summa.replace(/\s/g, '')) || 0;
  const kursNum = Number(f.kurs) || 0;
  const uzs = needKurs ? (kursNum ? Math.round(summaNum * kursNum) : 0) : summaNum;

  const inp: React.CSSProperties = { backgroundColor: '#0A0F0D', border: `1px solid ${C.line}`, color: '#fff', padding: '9px 11px', borderRadius: 8, fontSize: 13.5, outline: 'none', width: '100%' };
  const lbl: React.CSSProperties = { color: C.mut, fontSize: 11.5, fontWeight: 600, marginBottom: 5, display: 'block' };

  const save = async () => {
    setErr('');
    if (!summaNum || summaNum <= 0) { setErr("Summa 0 dan katta bo'lishi kerak"); return; }
    if (needKurs && kursNum <= 0) { setErr('Valyuta so‘mdan boshqa — kursni kiriting'); return; }
    setBusy(true);
    try {
      const partner = refs.suppliers.find((s) => String(s.id) === f.partnerId);
      const r = await fetch('/api/avia/turizm', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oy, id: y.id, tur: f.tur, sana: f.sana, summa: summaNum,
          kurs: needKurs && kursNum ? kursNum : 0,
          currencyId: f.currencyId || undefined, valyuta: curName,
          partnerId: f.partnerId || undefined, partnerNomi: partner?.name,
          cashId: f.cashId || undefined, formId: f.formId || undefined,
          izoh: f.izoh.trim(),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error || 'Xatolik'); return; }
      onSaved();
    } catch { setErr("Serverga ulanib bo'lmadi"); }
    finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: '#000A', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, zIndex: 50, overflow: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, width: '100%', maxWidth: 560, marginTop: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Tahrirlash — zayavka {y.zayavka}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.mut, cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['prixot', 'rasxod'] as TurizmTur[]).map((t) => {
            const active = f.tur === t; const col = t === 'prixot' ? C.green : C.red;
            return (
              <button key={t} onClick={() => setF({ ...f, tur: t })}
                style={{ flex: 1, padding: 9, borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13.5, border: `1px solid ${active ? col : C.line}`, backgroundColor: active ? col + '18' : '#0A0F0D', color: active ? col : C.mut }}>
                {TURIZM_TUR_LABEL[t]}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div><label style={lbl}>Sana</label><input type="date" value={f.sana} onChange={(e) => setF({ ...f, sana: e.target.value })} style={inp} /></div>
          <div><label style={lbl}>Summa</label><input inputMode="numeric" value={f.summa} onChange={(e) => setF({ ...f, summa: e.target.value })} style={{ ...inp, textAlign: 'right', fontFamily: 'var(--font-geist-mono)' }} /></div>
          <div>
            <label style={lbl}>Valyuta</label>
            <select value={f.currencyId} onChange={(e) => setF({ ...f, currencyId: e.target.value })} style={inp}>
              {refs.currencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {needKurs && (
            <div>
              <label style={lbl}>Kurs</label>
              <input inputMode="numeric" value={f.kurs} onChange={(e) => setF({ ...f, kurs: e.target.value })} placeholder="12800" style={{ ...inp, textAlign: 'right', fontFamily: 'var(--font-geist-mono)' }} />
              {uzs > 0 && <div style={{ color: C.teal, fontSize: 11.5, marginTop: 4 }}>= {fmt(uzs)} so‘m</div>}
            </div>
          )}
          <div>
            <label style={lbl}>Partnyor</label>
            <select value={f.partnerId} onChange={(e) => setF({ ...f, partnerId: e.target.value })} style={inp}>
              <option value="">— yo‘q —</option>
              {refs.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Kassa</label>
            <select value={f.cashId} onChange={(e) => setF({ ...f, cashId: e.target.value })} style={inp}>
              <option value="">— standart —</option>
              {refs.cashboxes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>To‘lov shakli</label>
            <select value={f.formId} onChange={(e) => setF({ ...f, formId: e.target.value })} style={inp}>
              <option value="">— yo‘q —</option>
              {refs.forms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Izoh</label><input value={f.izoh} onChange={(e) => setF({ ...f, izoh: e.target.value })} style={inp} /></div>
        </div>

        {err && <div style={{ color: C.red, fontSize: 12.5, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {err}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 9, border: `1px solid ${C.line}`, backgroundColor: 'transparent', color: C.mut, fontSize: 13.5, cursor: 'pointer' }}>Bekor</button>
          <button onClick={save} disabled={busy} style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${C.teal}`, backgroundColor: C.teal + '18', color: C.teal, fontSize: 13.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        </div>
        <div style={{ color: C.dim, fontSize: 11, marginTop: 10 }}>Eslatma: saqlashda U-ON to‘lovi qayta yoziladi (eski o‘chib, yangisi yaraladi).</div>
      </div>
    </div>
  );
}

// Mijozga beriladigan kassa cheki (prixot) — alohida oynada chop etiladi.
// Ma'lumot: zayavka mijozi/uslugasi (lookup'dan), summa + kurs + so'm ekvivalenti.
function printChek(y: TurizmYozuv) {
  const esc = (s: unknown) => String(s ?? '').replace(/[<>&]/g, (c) => (({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }) as Record<string, string>)[c]);
  const val = esc(y.valyuta || "so'm");
  const uzs = y.summaUzs ?? y.summa;
  const chekNo = esc(y.uonPaymentId || y.id.replace(/^TUR-/, '').slice(0, 8).toUpperCase());
  const row = (k: string, v: string) => `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`;
  const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>Chek ${chekNo}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;color:#000;background:#fff;padding:10px;width:300px}
  .c{text-align:center}
  h1{font-size:19px;letter-spacing:1px}
  .sub{font-size:11px;margin-bottom:8px}
  hr{border:none;border-top:1px dashed #000;margin:8px 0}
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  td{padding:2px 0;vertical-align:top}
  td.k{color:#333;white-space:nowrap;padding-right:8px}
  td.v{text-align:right;font-weight:bold}
  .jami td{font-size:15px;padding-top:4px}
  .sign{font-size:12px;margin-top:14px}
  .foot{font-size:11px;margin-top:12px}
  @media print{body{width:auto;padding:0}@page{margin:6mm}}
</style></head><body>
  <div class="c"><h1>SEM TRAVEL</h1><div class="sub">Turizm — kassa cheki (prixot)</div></div>
  <hr>
  <table>${row('Chek №', chekNo)}${row('Sana', esc(y.sana))}</table>
  <hr>
  <table>${row('Mijoz', esc(y.mijoz || '—'))}${row('Zayavka', esc(y.zayavka))}${y.xizmat ? row('Xizmat', esc(y.xizmat)) : ''}</table>
  <hr>
  <table>${row('Summa', esc(fmt(y.summa)) + ' ' + val)}${y.kurs ? row('Kurs', '× ' + esc(fmt(y.kurs))) : ''}<tr class="jami"><td class="k">JAMI</td><td class="v">${esc(fmt(uzs))} so'm</td></tr></table>
  <hr>
  <div class="sign">Qabul qildi: <b>${esc(y.yaratdi)}</b></div>
  <div class="sign">Imzo: ______________________</div>
  <div class="c foot">Rahmat! Xayrli sayohat.</div>
  <script>window.onload=function(){window.print()}</script>
</body></html>`;
  const w = window.open('', '_blank', 'width=360,height=640');
  if (!w) { alert("Chop oynasi ochilmadi — brauzer popup'ni bloklamasin."); return; }
  w.document.write(html);
  w.document.close();
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
