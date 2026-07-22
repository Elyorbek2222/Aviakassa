'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import {
  Banknote, Smartphone, Building2, ArrowUpRight, ArrowDownRight,
  CheckCircle2, Landmark, Calculator, Pencil, Lock, X,
  Wallet, DollarSign, BookOpen, ArrowLeftRight, Users, Plane, Search, ReceiptText, ArrowRight, Send, Download,
} from 'lucide-react';
import { formatMoney, ticketEditRemainingMs, ticketCreatedAtMs } from '@/lib/utils';
import { AIRLINE_LABELS, PEREVOD_TUR_LABEL, type PaymentType, type Valyuta, type AirlineKey, type AviaPayment, type Rasxod, type AviaTicket, type Obmen, type Inkassatsiya, type Perevod, type PerevodTur } from '@/types/avia';
import AviaDebtTable from '@/components/avia/AviaDebtTable';
import RasxodForm from '@/components/avia/RasxodForm';
import PeriodFilter from '@/components/avia/PeriodFilter';
import SotuvBalansCard from '@/components/avia/SotuvBalansCard';
import { periodQuery, periodLabel, periodRange, inPeriod } from '@/lib/period';
import { inputStyle, labelStyle, MessageBox } from '@/components/avia/formStyles';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ===== Tema tokenlari =====
const T = {
  bg: '#0A0F0D', card: '#141F19', line: '#1E2E24', mut: '#8A9A8F', dim: '#4A5C50',
  text: '#fff', green: '#7CFF4F', blue: '#2CA5E0', red: '#FF5C5C', orange: '#F5A623', purple: '#9B59B6', teal: '#14B8A6', indigo: '#6366F1',
};
const ACCENT = T.blue;
const card: React.CSSProperties = { backgroundColor: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 20 };
const fmtUsd = (n: number) => n.toLocaleString('en-US');

function PaymentForm({ onSuccess, tickets, payments }: { onSuccess: () => void; tickets: AviaTicket[]; payments: AviaPayment[] }) {
  const [form, setForm] = useState({
    biletRaqam: '',
    mijozIsmi: '',
    valyuta: 'uzs' as Valyuta,
    summAsl: '',
    kurs: '',
    summa: '',
    tolovTuri: 'naqd' as PaymentType,
    izoh: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  // Aralash to'lov: bir bilet uchun naqd/plastik/perechisleniya alohida summalar (faqat UZS)
  const [aralash, setAralash] = useState(false);
  const [qism, setQism] = useState({ naqd: '', plastik: '', perechisleniya: '' });

  // Aqlli bilet bog'lash: kiritilgan bilet raqamiga mos biletni topib, qolgan
  // qarzni ko'rsatamiz va mijoz ismini avtomatik to'ldiramiz.
  const bilet = form.biletRaqam.trim();
  const matchedTicket = useMemo(
    () => (bilet ? tickets.find((t) => t.biletRaqam === bilet) : undefined),
    [bilet, tickets]
  );
  const tolangan = useMemo(
    () => (bilet ? payments.filter((p) => p.biletRaqam === bilet).reduce((s, p) => s + p.summa, 0) : 0),
    [bilet, payments]
  );
  const qolgan = matchedTicket ? matchedTicket.sotishNarxi - tolangan : null;
  const partsTotal = (Number(qism.naqd) || 0) + (Number(qism.plastik) || 0) + (Number(qism.perechisleniya) || 0);
  const enteredSumma = aralash ? partsTotal : (Number(form.summa) || 0);
  const overpay = qolgan !== null && enteredSumma > qolgan;

  // Bilet raqami o'zgarganda: mos bilet bo'lsa va mijoz ismi bo'sh bo'lsa — avtomatik to'ldirish
  const onBiletChange = (val: string) => {
    const t = tickets.find((tk) => tk.biletRaqam === val.trim());
    setForm((f) => ({ ...f, biletRaqam: val, mijozIsmi: !f.mijozIsmi && t ? t.yolovchi : f.mijozIsmi }));
  };

  const submitPayment = (allowOverpay: boolean) => {
    const mijozIsmi = form.mijozIsmi || (form.valyuta === 'usd' && !form.biletRaqam ? 'Obmen' : form.mijozIsmi);
    const body = aralash
      ? {
          biletRaqam: form.biletRaqam, mijozIsmi, izoh: form.izoh, allowOverpay,
          qismlar: (['naqd', 'plastik', 'perechisleniya'] as PaymentType[])
            .map((k) => ({ tolovTuri: k, summa: Number(qism[k]) || 0 }))
            .filter((q) => q.summa > 0),
        }
      : {
          ...form, mijozIsmi,
          summAsl: form.valyuta === 'usd' ? Number(form.summAsl) : undefined,
          kurs: form.valyuta === 'usd' ? Number(form.kurs) : undefined,
          summa: Number(form.summa), allowOverpay,
        };
    return fetch('/api/avia/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (aralash && partsTotal <= 0) {
      setMessage("Kamida bitta usul bo'yicha summa kiriting");
      setLoading(false);
      return;
    }

    try {
      let res = await submitPayment(false);

      // 409 = qolgan qarzdan ortiq to'lov: tasdiq so'rab, baribir kiritish
      if (res.status === 409) {
        const d = await res.json().catch(() => ({}));
        if (d.overpay && confirm(`${d.error}. Baribir kiritilsinmi?`)) {
          res = await submitPayment(true);
        } else {
          setMessage(d.error || "Ortiqcha to'lov");
          setLoading(false);
          return;
        }
      }

      if (res.ok) {
        setMessage("To'lov saqlandi!");
        setForm({ biletRaqam: '', mijozIsmi: '', valyuta: 'uzs', summAsl: '', kurs: '', summa: '', tolovTuri: 'naqd', izoh: '' });
        setQism({ naqd: '', plastik: '', perechisleniya: '' });
        setAralash(false);
        onSuccess();
      } else {
        const d = await res.json().catch(() => ({}));
        setMessage(d.error || 'Xatolik yuz berdi');
      }
    } catch {
      setMessage("Serverga ulanib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {form.valyuta === 'usd' ? (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Bilet Raqami (ixtiyoriy)</label>
          <input type="text" value={form.biletRaqam} onChange={(e) => onBiletChange(e.target.value)} placeholder="Bo'sh = Obmen" style={inputStyle} />
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Bilet Raqami</label>
          <input type="text" value={form.biletRaqam} onChange={(e) => onBiletChange(e.target.value)} placeholder="001-1234567890" style={inputStyle} />
        </div>
      )}

      {/* Aqlli bilet kartasi: mos bilet topilganda qolgan qarzni ko'rsatadi */}
      {matchedTicket && (
        <div style={{
          marginBottom: 14, padding: '10px 12px', borderRadius: 8, fontSize: 12.5,
          backgroundColor: overpay ? '#F5A62312' : '#14B8A612',
          border: `1px solid ${overpay ? T.orange : T.teal}40`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: T.text }}>
            <span style={{ fontWeight: 600 }}>{matchedTicket.yolovchi}</span>
            <span style={{ color: T.mut }}>Sotish: {formatMoney(matchedTicket.sotishNarxi)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ color: T.mut }}>To&apos;langan: {formatMoney(tolangan)}</span>
            <span style={{ color: (qolgan ?? 0) > 0 ? T.orange : T.green, fontWeight: 700 }}>
              Qolgan qarz: {formatMoney(qolgan ?? 0)}
            </span>
          </div>
          {overpay && (
            <div style={{ marginTop: 6, color: T.orange, fontWeight: 600 }}>
              ⚠ Kiritilgan summa qolgan qarzdan oshib ketmoqda
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Mijoz Ismi</label>
        <input type="text" value={form.mijozIsmi} onChange={(e) => setForm({ ...form, mijozIsmi: e.target.value })} placeholder={form.valyuta === 'usd' && !form.biletRaqam ? 'Obmen' : 'Familiya Ism'} style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Valyuta</label>
          <select value={form.valyuta} onChange={(e) => { const v = e.target.value as Valyuta; setForm({ ...form, valyuta: v }); if (v === 'usd') setAralash(false); }} style={inputStyle}>
            <option value="uzs">UZS</option>
            <option value="usd">USD</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>To&apos;lov turi</label>
          {aralash ? (
            <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: T.mut }}>Aralash</div>
          ) : (
            <select value={form.tolovTuri} onChange={(e) => setForm({ ...form, tolovTuri: e.target.value as PaymentType })} style={inputStyle}>
              <option value="naqd">Naqd</option>
              <option value="plastik">Plastik</option>
              <option value="perechisleniya">Perechisleniya</option>
            </select>
          )}
        </div>
      </div>

      {/* Aralash to'lov — bir bilet uchun bir nechta usul (faqat UZS) */}
      {form.valyuta === 'uzs' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer', color: T.mut, fontSize: 12.5 }}>
          <input type="checkbox" checked={aralash} onChange={(e) => setAralash(e.target.checked)} />
          Aralash to&apos;lov — bir bilet uchun naqd + plastik + perechisleniya
        </label>
      )}

      {form.valyuta === 'usd' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>USD Summa</label>
            <input type="number" value={form.summAsl} onChange={(e) => {
              const usd = e.target.value;
              const uzs = usd && form.kurs ? String(Number(usd) * Number(form.kurs)) : form.summa;
              setForm({ ...form, summAsl: usd, summa: uzs });
            }} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Kurs</label>
            <input type="number" value={form.kurs} onChange={(e) => {
              const kurs = e.target.value;
              const uzs = form.summAsl && kurs ? String(Number(form.summAsl) * Number(kurs)) : form.summa;
              setForm({ ...form, kurs, summa: uzs });
            }} placeholder="12800" style={inputStyle} />
          </div>
        </div>
      )}
      {aralash ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {(['naqd', 'plastik', 'perechisleniya'] as PaymentType[]).map((k) => (
              <div key={k}>
                <label style={labelStyle}>{k === 'naqd' ? 'Naqd' : k === 'plastik' ? 'Plastik' : 'Perechisl.'}</label>
                <input type="number" inputMode="numeric" value={qism[k]} onChange={(e) => setQism({ ...qism, [k]: e.target.value })} placeholder="0" style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, textAlign: 'right', color: T.text, fontSize: 13 }}>
            Jami: <b>{formatMoney(partsTotal)}</b>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Summa (UZS)</label>
          <input type="number" value={form.summa} onChange={(e) => setForm({ ...form, summa: e.target.value })} placeholder="0" required style={inputStyle} />
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Izoh</label>
        <input type="text" value={form.izoh} onChange={(e) => setForm({ ...form, izoh: e.target.value })} placeholder="Qo'shimcha ma'lumot" style={inputStyle} />
      </div>
      <MessageBox message={message} />
      <button type="submit" disabled={loading} style={{
        width: '100%', padding: '12px 20px', borderRadius: 9, border: `1px solid ${ACCENT}`,
        backgroundColor: `${ACCENT}20`, color: ACCENT, fontSize: 14, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
        transition: 'background-color 0.15s ease', letterSpacing: '0.04em',
      }}>
        {loading ? 'Saqlanmoqda...' : '+ Prixod Kirgizish'}
      </button>
    </form>
  );
}

// Inkassatsiya: aviakompaniyaga to'lov yoki kunlik kassa topshirish (bare form)
function InkassatsiyaTab({ onSuccess }: { onSuccess: () => void }) {
  const [turi, setTuri] = useState<'aviakompaniya' | 'kassa'>('aviakompaniya');
  const [airline, setAirline] = useState<AirlineKey>('uzairways');
  const [summa, setSumma] = useState('');
  const [izoh, setIzoh] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const body = turi === 'kassa'
        ? { turi, airline: 'boshqa', airlineName: 'Kassa topshirish', summa: Number(summa), izoh: izoh || undefined }
        : { turi, airline, airlineName: AIRLINE_LABELS[airline] || airline, summa: Number(summa), izoh: izoh || undefined };
      const res = await fetch('/api/avia/inkassatsiya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) { setMessage('Inkassatsiya saqlandi!'); setSumma(''); setIzoh(''); onSuccess(); }
      else setMessage('Xatolik');
    } catch { setMessage('Xatolik'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([
          { key: 'aviakompaniya' as const, label: 'Aviakompaniyaga' },
          { key: 'kassa' as const, label: 'Kassa topshirish' },
        ]).map((opt) => (
          <button type="button" key={opt.key} onClick={() => setTuri(opt.key)} style={{
            flex: 1, padding: '9px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${turi === opt.key ? T.purple : T.line}`,
            backgroundColor: turi === opt.key ? '#9B59B618' : 'transparent',
            color: turi === opt.key ? T.purple : T.dim,
          }}>{opt.label}</button>
        ))}
      </div>
      {turi === 'aviakompaniya' && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Aviakompaniya (partnyor)</label>
          <select value={airline} onChange={(e) => setAirline(e.target.value as AirlineKey)} style={inputStyle}>
            {Object.entries(AIRLINE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Summa (UZS)</label>
        <input type="number" value={summa} onChange={(e) => setSumma(e.target.value)} placeholder="0" required style={inputStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Izoh</label>
        <input type="text" value={izoh} onChange={(e) => setIzoh(e.target.value)} placeholder={turi === 'kassa' ? 'Kimga topshirildi?' : "Qo'shimcha ma'lumot"} style={inputStyle} />
      </div>
      <MessageBox message={message} />
      <button type="submit" disabled={loading} style={{
        width: '100%', padding: '12px 20px', borderRadius: 9, border: `1px solid ${T.purple}`,
        backgroundColor: '#9B59B618', color: T.purple, fontSize: 14, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, letterSpacing: '0.04em',
      }}>
        {loading ? 'Saqlanmoqda...' : turi === 'kassa' ? '↪ Kassa Topshirish' : '↪ Inkassatsiya Yozish'}
      </button>
    </form>
  );
}

// Perevod: bank hisobidan chiqim (aviakompaniya / nalog / ish haqi / boshqa)
function PerevodTab({ onSuccess }: { onSuccess: () => void }) {
  const [tur, setTur] = useState<PerevodTur>('aviakompaniya');
  const [airline, setAirline] = useState<AirlineKey>('uzairways');
  const [summa, setSumma] = useState('');
  const [izoh, setIzoh] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const body: Record<string, unknown> = { tur, summa: Number(summa), izoh: izoh || undefined };
      if (tur === 'aviakompaniya') body.airline = airline;
      const res = await fetch('/api/avia/perevod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) { setMessage('Perevod saqlandi!'); setSumma(''); setIzoh(''); onSuccess(); }
      else { const d = await res.json().catch(() => ({})); setMessage(d.error || 'Xatolik'); }
    } catch { setMessage("Serverga ulanib bo'lmadi"); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {(Object.keys(PEREVOD_TUR_LABEL) as PerevodTur[]).map((k) => (
          <button type="button" key={k} onClick={() => setTur(k)} style={{
            padding: '9px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${tur === k ? T.indigo : T.line}`,
            backgroundColor: tur === k ? T.indigo + '18' : 'transparent',
            color: tur === k ? T.indigo : T.dim,
          }}>{PEREVOD_TUR_LABEL[k]}</button>
        ))}
      </div>
      {tur === 'aviakompaniya' && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Aviakompaniya (partnyor)</label>
          <select value={airline} onChange={(e) => setAirline(e.target.value as AirlineKey)} style={inputStyle}>
            {Object.entries(AIRLINE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Summa (UZS)</label>
        <input type="number" value={summa} onChange={(e) => setSumma(e.target.value)} placeholder="0" required style={inputStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Izoh</label>
        <input type="text" value={izoh} onChange={(e) => setIzoh(e.target.value)} placeholder="To'lov asosi / izoh" style={inputStyle} />
      </div>
      <MessageBox message={message} />
      <button type="submit" disabled={loading} style={{
        width: '100%', padding: '12px 20px', borderRadius: 9, border: `1px solid ${T.indigo}`,
        backgroundColor: T.indigo + '18', color: T.indigo, fontSize: 14, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, letterSpacing: '0.04em',
      }}>
        {loading ? 'Saqlanmoqda...' : '↪ Perevod (bankdan)'}
      </button>
    </form>
  );
}

// Obmen: kassadagi USD ni som ga o'tkazish (USD chiqadi, UZS kiradi)
function ObmenForm({ onSuccess, usdMavjud }: { onSuccess: () => void; usdMavjud: number }) {
  const [usd, setUsd] = useState('');
  const [kurs, setKurs] = useState('');
  const [izoh, setIzoh] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const uzs = usd && kurs ? Math.round(Number(usd) * Number(kurs)) : 0;
  const yetarsiz = Number(usd) > 0 && Number(usd) > usdMavjud;

  const submitObmen = (allowNegative: boolean) =>
    fetch('/api/avia/obmen', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usdSumma: Number(usd), kurs: Number(kurs), izoh: izoh || undefined, allowNegative }),
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMessage('');
    try {
      let res = await submitObmen(false);
      // 409 = kassada yetarli USD yo'q: tasdiq so'rab, baribir o'tkazish
      if (res.status === 409) {
        const d = await res.json().catch(() => ({}));
        if (d.insufficient && confirm(`${d.error}. Baribir obmen qilinsinmi?`)) {
          res = await submitObmen(true);
        } else { setMessage(d.error || "Yetarli USD yo'q"); setLoading(false); return; }
      }
      if (res.ok) { setMessage('Obmen saqlandi!'); setUsd(''); setKurs(''); setIzoh(''); onSuccess(); }
      else { const d = await res.json().catch(() => ({})); setMessage(d.error || 'Xatolik yuz berdi'); }
    } catch { setMessage("Serverga ulanib bo'lmadi"); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ padding: '10px 14px', borderRadius: 9, backgroundColor: T.teal + '12', border: `1px solid ${T.teal}30`, marginBottom: 16, fontSize: 12.5, color: T.mut }}>
        Kassada mavjud USD: <b style={{ color: T.teal }}>${fmtUsd(usdMavjud)}</b>. Obmen qilingach USD kamayadi, so&apos;m ko&apos;payadi.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>USD summa</label>
          <input type="number" value={usd} onChange={(e) => setUsd(e.target.value)} placeholder="0" required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Kurs</label>
          <input type="number" value={kurs} onChange={(e) => setKurs(e.target.value)} placeholder="12800" required style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Olinadigan so&apos;m (avtomatik)</label>
        <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: T.green, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(uzs)} so&apos;m</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Izoh</label>
        <input type="text" value={izoh} onChange={(e) => setIzoh(e.target.value)} placeholder="Qayerda obmen qilindi?" style={inputStyle} />
      </div>
      {yetarsiz && (
        <div style={{ marginBottom: 12, padding: '9px 12px', borderRadius: 8, backgroundColor: T.orange + '12', border: `1px solid ${T.orange}40`, color: T.orange, fontSize: 12.5, fontWeight: 600 }}>
          ⚠ Kassadagi USD (${fmtUsd(usdMavjud)}) dan ortiq obmen qilinyapti
        </div>
      )}
      <MessageBox message={message} />
      <button type="submit" disabled={loading} style={{
        width: '100%', padding: '12px 20px', borderRadius: 9, border: `1px solid ${T.teal}`,
        backgroundColor: T.teal + '20', color: T.teal, fontSize: 14, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, letterSpacing: '0.04em',
      }}>
        {loading ? 'Saqlanmoqda...' : '⇄ Obmen qilish (USD → som)'}
      </button>
    </form>
  );
}

// ===== Tahrirlash modallari (Finans otdel: 48 soat ichida xatoni to'g'irlash) =====

function ModalShell({ title, accent, onClose, children }: { title: string; accent: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto', zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, backgroundColor: T.card, border: `1px solid ${T.line}`, borderTop: `2px solid ${accent}`, borderRadius: 14, padding: 24, marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pencil size={18} style={{ color: accent }} /> {title}
          </h3>
          <button onClick={onClose} aria-label="Yopish" style={{ background: 'none', border: 'none', color: T.mut, cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PaymentEditModal({ payment, onClose, onSaved }: { payment: AviaPayment; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    biletRaqam: payment.biletRaqam || '',
    mijozIsmi: payment.mijozIsmi || '',
    valyuta: payment.valyuta,
    summAsl: payment.summAsl ? String(payment.summAsl) : '',
    kurs: payment.kurs ? String(payment.kurs) : '',
    summa: String(payment.summa),
    tolovTuri: payment.tolovTuri,
    izoh: payment.izoh || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage('');
    try {
      const res = await fetch('/api/avia/payments', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payment.id, biletRaqam: form.biletRaqam, mijozIsmi: form.mijozIsmi,
          valyuta: form.valyuta,
          summAsl: form.valyuta === 'usd' ? Number(form.summAsl) : undefined,
          kurs: form.valyuta === 'usd' ? Number(form.kurs) : undefined,
          summa: Number(form.summa), tolovTuri: form.tolovTuri, izoh: form.izoh,
        }),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json().catch(() => ({})); setMessage(d.error || 'Xatolik'); }
    } catch { setMessage("Serverga ulanib bo'lmadi"); }
    finally { setLoading(false); }
  };

  return (
    <ModalShell title="Prixodni tahrirlash" accent={T.blue} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Bilet Raqami</label>
          <input type="text" value={form.biletRaqam} onChange={(e) => setForm({ ...form, biletRaqam: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Mijoz Ismi</label>
          <input type="text" value={form.mijozIsmi} onChange={(e) => setForm({ ...form, mijozIsmi: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Valyuta</label>
            <select value={form.valyuta} onChange={(e) => setForm({ ...form, valyuta: e.target.value as Valyuta })} style={inputStyle}>
              <option value="uzs">UZS</option><option value="usd">USD</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>To&apos;lov turi</label>
            <select value={form.tolovTuri} onChange={(e) => setForm({ ...form, tolovTuri: e.target.value as PaymentType })} style={inputStyle}>
              <option value="naqd">Naqd</option><option value="plastik">Plastik</option><option value="perechisleniya">Perechisleniya</option>
            </select>
          </div>
        </div>
        {form.valyuta === 'usd' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>USD Summa</label>
              <input type="number" value={form.summAsl} onChange={(e) => { const usd = e.target.value; const uzs = usd && form.kurs ? String(Number(usd) * Number(form.kurs)) : form.summa; setForm({ ...form, summAsl: usd, summa: uzs }); }} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Kurs</label>
              <input type="number" value={form.kurs} onChange={(e) => { const kurs = e.target.value; const uzs = form.summAsl && kurs ? String(Number(form.summAsl) * Number(kurs)) : form.summa; setForm({ ...form, kurs, summa: uzs }); }} style={inputStyle} />
            </div>
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Summa (UZS)</label>
          <input type="number" value={form.summa} onChange={(e) => setForm({ ...form, summa: e.target.value })} required style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Izoh</label>
          <input type="text" value={form.izoh} onChange={(e) => setForm({ ...form, izoh: e.target.value })} style={inputStyle} />
        </div>
        <MessageBox message={message} />
        <SaveButtons loading={loading} accent={T.blue} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function RasxodEditModal({ rasxod, onClose, onSaved }: { rasxod: Rasxod; onClose: () => void; onSaved: () => void }) {
  const [summa, setSumma] = useState(String(rasxod.summa));
  const [sabab, setSabab] = useState(rasxod.sabab || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage('');
    try {
      const res = await fetch('/api/avia/rasxod', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rasxod.id, summa: Number(summa), sabab }),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json().catch(() => ({})); setMessage(d.error || 'Xatolik'); }
    } catch { setMessage("Serverga ulanib bo'lmadi"); }
    finally { setLoading(false); }
  };

  return (
    <ModalShell title="Rasxodni tahrirlash" accent={T.red} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Summa (UZS)</label>
          <input type="number" value={summa} onChange={(e) => setSumma(e.target.value)} required style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Sabab</label>
          <input type="text" value={sabab} onChange={(e) => setSabab(e.target.value)} placeholder="Nima uchun chiqim" style={inputStyle} />
        </div>
        <MessageBox message={message} />
        <SaveButtons loading={loading} accent={T.red} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function ObmenEditModal({ obmen, onClose, onSaved }: { obmen: Obmen; onClose: () => void; onSaved: () => void }) {
  const [usd, setUsd] = useState(String(obmen.usdSumma));
  const [kurs, setKurs] = useState(String(obmen.kurs));
  const [izoh, setIzoh] = useState(obmen.izoh || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const uzs = usd && kurs ? Math.round(Number(usd) * Number(kurs)) : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage('');
    try {
      const res = await fetch('/api/avia/obmen', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: obmen.id, usdSumma: Number(usd), kurs: Number(kurs), uzsSumma: uzs, izoh }),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json().catch(() => ({})); setMessage(d.error || 'Xatolik'); }
    } catch { setMessage("Serverga ulanib bo'lmadi"); }
    finally { setLoading(false); }
  };

  return (
    <ModalShell title="Obmenni tahrirlash" accent={T.teal} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>USD summa</label>
            <input type="number" value={usd} onChange={(e) => setUsd(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Kurs</label>
            <input type="number" value={kurs} onChange={(e) => setKurs(e.target.value)} required style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Olinadigan so&apos;m</label>
          <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: T.green, fontWeight: 700 }}>{formatMoney(uzs)} so&apos;m</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Izoh</label>
          <input type="text" value={izoh} onChange={(e) => setIzoh(e.target.value)} style={inputStyle} />
        </div>
        <MessageBox message={message} />
        <SaveButtons loading={loading} accent={T.teal} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function InkassatsiyaEditModal({ inkas, onClose, onSaved }: { inkas: Inkassatsiya; onClose: () => void; onSaved: () => void }) {
  const [summa, setSumma] = useState(String(inkas.summa));
  const [izoh, setIzoh] = useState(inkas.izoh || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage('');
    try {
      const res = await fetch('/api/avia/inkassatsiya', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inkas.id, summa: Number(summa), izoh }),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json().catch(() => ({})); setMessage(d.error || 'Xatolik'); }
    } catch { setMessage("Serverga ulanib bo'lmadi"); }
    finally { setLoading(false); }
  };

  return (
    <ModalShell title="Inkassatsiyani tahrirlash" accent={T.purple} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: T.purple + '10', border: `1px solid ${T.purple}25`, marginBottom: 14, fontSize: 12, color: T.mut }}>
          {inkas.turi === 'kassa' ? 'Kassa topshirish' : (inkas.airlineName || 'Inkassatsiya')}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Summa (UZS)</label>
          <input type="number" value={summa} onChange={(e) => setSumma(e.target.value)} required style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Izoh</label>
          <input type="text" value={izoh} onChange={(e) => setIzoh(e.target.value)} style={inputStyle} />
        </div>
        <MessageBox message={message} />
        <SaveButtons loading={loading} accent={T.purple} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function PerevodEditModal({ perevod, onClose, onSaved }: { perevod: Perevod; onClose: () => void; onSaved: () => void }) {
  const [summa, setSumma] = useState(String(perevod.summa));
  const [izoh, setIzoh] = useState(perevod.izoh || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage('');
    try {
      const res = await fetch('/api/avia/perevod', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: perevod.id, summa: Number(summa), izoh }),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json().catch(() => ({})); setMessage(d.error || 'Xatolik'); }
    } catch { setMessage("Serverga ulanib bo'lmadi"); }
    finally { setLoading(false); }
  };

  const nomi = perevod.tur === 'aviakompaniya' ? (perevod.airlineName || 'Aviakompaniya') : PEREVOD_TUR_LABEL[perevod.tur];
  return (
    <ModalShell title="Perevodni tahrirlash" accent={T.indigo} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: T.indigo + '10', border: `1px solid ${T.indigo}25`, marginBottom: 14, fontSize: 12, color: T.mut }}>
          {nomi}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Summa (UZS)</label>
          <input type="number" value={summa} onChange={(e) => setSumma(e.target.value)} required style={inputStyle} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Izoh</label>
          <input type="text" value={izoh} onChange={(e) => setIzoh(e.target.value)} style={inputStyle} />
        </div>
        <MessageBox message={message} />
        <SaveButtons loading={loading} accent={T.indigo} onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function SaveButtons({ loading, accent, onClose }: { loading: boolean; accent: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 8, border: `1px solid ${T.line}`, backgroundColor: 'transparent', color: T.mut, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Bekor qilish</button>
      <button type="submit" disabled={loading} style={{ flex: 2, padding: 12, borderRadius: 8, border: 'none', backgroundColor: accent, color: T.bg, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Saqlanmoqda...' : "O'zgartirishni saqlash"}
      </button>
    </div>
  );
}

const TABS = [
  { key: 'prixod' as const, label: 'Prixod', color: T.blue, icon: <ArrowUpRight size={14} /> },
  { key: 'rasxod' as const, label: 'Rasxod', color: T.red, icon: <ArrowDownRight size={14} /> },
  { key: 'obmen' as const, label: 'Obmen', color: T.teal, icon: <ArrowLeftRight size={14} /> },
  { key: 'inkassatsiya' as const, label: 'Inkassatsiya', color: T.purple, icon: <Landmark size={14} /> },
  { key: 'perevod' as const, label: 'Perevod', color: T.indigo, icon: <Send size={14} /> },
];

type TabKey = 'prixod' | 'rasxod' | 'obmen' | 'inkassatsiya' | 'perevod';
type ViewKey = 'kassa' | 'hisobot';
type ReportKey = 'kitob' | 'jurnal' | 'qarz' | 'biletlar';

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', color: T.dim, fontSize: 11, fontWeight: 600,
  letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: `1px solid ${T.line}`,
  position: 'sticky', top: 0, backgroundColor: '#0E1611', zIndex: 1,
};

export default function FinansistPage() {
  const [view, setView] = useState<ViewKey>('kassa');
  const [report, setReport] = useState<ReportKey>('jurnal');
  const [bookCur, setBookCur] = useState<Valyuta>('uzs');
  const [tab, setTab] = useState<TabKey>('prixod');
  const [hover, setHover] = useState<string | null>(null);
  const [period, setPeriod] = useState('today');
  const [sanalganNaqd, setSanalganNaqd] = useState('');
  const [editPayment, setEditPayment] = useState<AviaPayment | null>(null);
  const [editRasxod, setEditRasxod] = useState<Rasxod | null>(null);
  const [editObmen, setEditObmen] = useState<Obmen | null>(null);
  const [editInk, setEditInk] = useState<Inkassatsiya | null>(null);
  const [editPerevod, setEditPerevod] = useState<Perevod | null>(null);
  const [movFilter, setMovFilter] = useState<'all' | 'prixod' | 'rasxod' | 'obmen' | 'inkas' | 'perevod'>('all');
  const [movSearch, setMovSearch] = useState('');
  const [tixSearch, setTixSearch] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);
  // Yon menyudagi "Hisobotlar" linki /kassir?view=hisobot ga olib keladi — shu ko'rinishni ochamiz
  useEffect(() => {
    // ponytail: URL faqat mount'dan keyin (client) o'qiladi — hydration mos qolishi uchun.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'hisobot') setView('hisobot');
  }, []);

  const { data: paymentsData, mutate: mutatePayments } = useSWR('/api/avia/payments', fetcher, { refreshInterval: 60000 });
  const { data: rasxodData, mutate: mutateRasxod } = useSWR('/api/avia/rasxod', fetcher, { refreshInterval: 60000 });
  const { data: inkData, mutate: mutateInk } = useSWR('/api/avia/inkassatsiya', fetcher, { refreshInterval: 60000 });
  const { data: obmenData, mutate: mutateObmen } = useSWR('/api/avia/obmen', fetcher, { refreshInterval: 60000 });
  const { data: perevodData, mutate: mutatePerevod } = useSWR('/api/avia/perevod', fetcher, { refreshInterval: 60000 });
  const { data: ticketsData } = useSWR('/api/avia/tickets', fetcher, { refreshInterval: 60000 });
  const { data: reportsData, mutate: mutateReports } = useSWR(`/api/avia/reports${periodQuery(period)}`, fetcher, { refreshInterval: 60000 });

  // Hammasi (kassa kitobi/kümülatив hisob uchun) va davrga filtrlangani
  const allPayments = (paymentsData?.payments || []) as AviaPayment[];
  const allRasxod = (rasxodData?.rasxodlar || []) as Rasxod[];
  const allInk = (inkData?.inkassatsiya || []) as Inkassatsiya[];
  const allObmen = (obmenData?.obmenlar || []) as Obmen[];
  const allPerevod = (perevodData?.perevodlar || []) as Perevod[];
  const allTickets = (ticketsData?.tickets || []) as AviaTicket[];
  const payments = allPayments.filter((p) => inPeriod(p.sana, period));
  const rasxodlar = allRasxod.filter((r) => inPeriod(r.sana, period));
  const inkPeriod = allInk.filter((i) => inPeriod(i.sana, period));
  const obmenPeriod = allObmen.filter((o) => inPeriod(o.sana, period));
  const perevodPeriod = allPerevod.filter((p) => inPeriod(p.sana, period));

  const debts = reportsData?.debts || [];
  const settledCount = reportsData?.kpi?.settledCount ?? 0;

  // ===== Logika: UZS va USD alohida hisoblanadi =====
  const uzsPay = payments.filter((p) => p.valyuta !== 'usd');
  const usdPay = payments.filter((p) => p.valyuta === 'usd');
  const byType = (arr: AviaPayment[], tt: PaymentType) => arr.filter((p) => p.tolovTuri === tt).reduce((s, p) => s + p.summa, 0);
  const naqd = byType(uzsPay, 'naqd');
  const plastik = byType(uzsPay, 'plastik');
  const perechisleniya = byType(uzsPay, 'perechisleniya');
  const bankUzs = plastik + perechisleniya; // karta + o'tkazma — bankda, naqd kassaga kirmaydi
  const usdKirim = usdPay.reduce((s, p) => s + (p.summAsl || 0), 0);

  const jamiRasxod = rasxodlar.reduce((s, r) => s + r.summa, 0);
  const jamiInk = inkPeriod.reduce((s, i) => s + i.summa, 0);
  const jamiKassaTopshirish = inkPeriod.filter((i) => i.turi === 'kassa').reduce((s, i) => s + i.summa, 0);
  const obmenUsd = obmenPeriod.reduce((s, o) => s + o.usdSumma, 0); // davrda USD dan chiqqan
  const obmenUzs = obmenPeriod.reduce((s, o) => s + o.uzsSumma, 0); // davrda so'mga kirgan
  const jamiPerevod = perevodPeriod.reduce((s, p) => s + p.summa, 0); // davrda bankdan chiqqan

  // ===== Kun boshi / kun oxiri ostatka (davr chegaralari bo'yicha kümülатив) =====
  // NAQD kassa (Excel OSTATOK) = naqd + obmen(so'm) − rasxod − inkassatsiya
  // (Refund KIRMAYDI — u Aviakassir tomonida faqat qayd, kassaga ta'sir qilmaydi.)
  // USD kassa = USD to'lovlar − obmen(USD)
  // Plastik/perechisleniya bankka boradi — naqd kassaga kirmaydi.
  const { from: pFrom, to: pTo } = periodRange(period);
  const before = (s: string) => (pFrom ? s < pFrom : false);   // davrdan oldin
  const upto = (s: string) => (pTo ? s <= pTo : true);          // davr oxirigacha
  const netUZS = (pred: (s: string) => boolean) => {
    let s = 0;
    allPayments.forEach((p) => { if (p.valyuta !== 'usd' && p.tolovTuri === 'naqd' && pred(p.sana)) s += p.summa; });
    allObmen.forEach((o) => { if (pred(o.sana)) s += o.uzsSumma; });
    allRasxod.forEach((r) => { if (pred(r.sana)) s -= r.summa; });
    allInk.forEach((i) => { if (pred(i.sana)) s -= i.summa; });
    return s;
  };
  const netUSD = (pred: (s: string) => boolean) => {
    let s = 0;
    allPayments.forEach((p) => { if (p.valyuta === 'usd' && pred(p.sana)) s += (p.summAsl || 0); });
    allObmen.forEach((o) => { if (pred(o.sana)) s -= o.usdSumma; });
    return s;
  };
  // BANK hisobi (schet): plastik + perechisleniya to'g'ridan-to'g'ri bankka; naqddan
  // "Kassa topshirish" bankka o'tkaziladi; perevodlar bankdan chiqadi.
  const netBank = (pred: (s: string) => boolean) => {
    let s = 0;
    allPayments.forEach((p) => { if (p.valyuta !== 'usd' && (p.tolovTuri === 'plastik' || p.tolovTuri === 'perechisleniya') && pred(p.sana)) s += p.summa; });
    allInk.forEach((i) => { if (i.turi === 'kassa' && pred(i.sana)) s += i.summa; }); // naqddan topshirilgan
    allPerevod.forEach((p) => { if (pred(p.sana)) s -= p.summa; });
    return s;
  };
  const uzsBoshi = netUZS(before);
  const uzsOxiri = netUZS(upto);
  const usdBoshi = netUSD(before);
  const usdOxiri = netUSD(upto);
  const bankBoshi = netBank(before);
  const bankOxiri = netBank(upto);

  // Naqd sverka (UZS): kutilgan naqd = UZS naqd kirim + obmen so'm − rasxod − kassa topshirish
  const kutilganNaqd = naqd + obmenUzs - jamiRasxod - jamiKassaTopshirish;
  const farq = sanalganNaqd === '' ? null : Number(sanalganNaqd) - kutilganNaqd;

  const refreshAll = () => { mutatePayments(); mutateRasxod(); mutateInk(); mutateObmen(); mutatePerevod(); mutateReports(); };

  // ===== Birlashgan Kirim-Chiqim jurnali =====
  type Mov = { id: string; kind: 'prixod' | 'rasxod' | 'obmen' | 'inkas' | 'perevod'; sana: string; summa: number; label: string; sub?: string; payment?: AviaPayment; rasxod?: Rasxod; obmen?: Obmen; inkas?: Inkassatsiya; perevod?: Perevod };
  const movements: Mov[] = [
    ...payments.map((p) => ({ id: p.id, kind: 'prixod' as const, sana: p.sana, summa: p.summa, label: p.mijozIsmi || p.biletRaqam || '—', sub: `${p.tolovTuri}${p.valyuta === 'usd' ? ` · $${fmtUsd(p.summAsl || 0)}` : ''}`, payment: p })),
    ...rasxodlar.map((r) => ({ id: r.id, kind: 'rasxod' as const, sana: r.sana, summa: r.summa, label: r.sabab || 'Rasxod', rasxod: r })),
    ...obmenPeriod.map((o) => ({ id: o.id, kind: 'obmen' as const, sana: o.sana, summa: o.uzsSumma, label: `Obmen $${fmtUsd(o.usdSumma)} → so'm`, sub: `kurs ${fmtUsd(o.kurs)}`, obmen: o })),
    ...inkPeriod.map((i) => ({ id: i.id, kind: 'inkas' as const, sana: i.sana, summa: i.summa, label: i.turi === 'kassa' ? 'Kassa topshirish' : (i.airlineName || 'Inkassatsiya'), inkas: i })),
    ...perevodPeriod.map((p) => ({ id: p.id, kind: 'perevod' as const, sana: p.sana, summa: p.summa, label: p.tur === 'aviakompaniya' ? (p.airlineName || 'Aviakompaniya') : PEREVOD_TUR_LABEL[p.tur], sub: `bank${p.izoh ? ` · ${p.izoh}` : ''}`, perevod: p })),
  ].sort((a, b) => ticketCreatedAtMs(b) - ticketCreatedAtMs(a));
  const movShown = movements.filter((m) => {
    if (movFilter !== 'all' && m.kind !== movFilter) return false;
    if (movSearch && !(`${m.label} ${m.sub || ''} ${m.sana}`).toLowerCase().includes(movSearch.toLowerCase())) return false;
    return true;
  });
  const MOV_META: Record<Mov['kind'], { label: string; color: string; sign: number }> = {
    prixod: { label: 'Prixod', color: T.blue, sign: 1 },
    rasxod: { label: 'Rasxod', color: T.red, sign: -1 },
    obmen: { label: 'Obmen', color: T.teal, sign: 1 },
    inkas: { label: 'Inkas.', color: T.purple, sign: -1 },
    perevod: { label: 'Perevod', color: T.indigo, sign: -1 },
  };

  // ===== Kassa kitobi (valyuta bo'yicha): kunlik ostatok boshi/oxiri =====
  const buildBook = (cur: Valyuta) => {
    const dm = new Map<string, { kirim: number; chiqim: number }>();
    const bump = (sana: string, kirim: number, chiqim: number) => {
      const e = dm.get(sana) || { kirim: 0, chiqim: 0 };
      e.kirim += kirim; e.chiqim += chiqim; dm.set(sana, e);
    };
    if (cur === 'uzs') {
      allPayments.forEach((p) => { if (p.valyuta !== 'usd' && p.tolovTuri === 'naqd') bump(p.sana, p.summa, 0); });
      allObmen.forEach((o) => bump(o.sana, o.uzsSumma, 0)); // obmen -> so'm kirim
      allRasxod.forEach((r) => bump(r.sana, 0, r.summa));
      allInk.forEach((i) => bump(i.sana, 0, i.summa));
    } else {
      allPayments.forEach((p) => { if (p.valyuta === 'usd') bump(p.sana, p.summAsl || 0, 0); });
      allObmen.forEach((o) => bump(o.sana, 0, o.usdSumma)); // obmen -> USD chiqim
    }
    const days = [...dm.keys()].sort();
    return days.map((sana, idx) => {
      const boshi = days.slice(0, idx).reduce((s, dd) => { const e = dm.get(dd)!; return s + e.kirim - e.chiqim; }, 0);
      const { kirim, chiqim } = dm.get(sana)!;
      return { sana, boshi, kirim, chiqim, oxiri: boshi + kirim - chiqim };
    });
  };
  const uzsBook = buildBook('uzs');
  const usdBook = buildBook('usd');
  const bookShown = (bookCur === 'usd' ? usdBook : uzsBook).filter((d) => inPeriod(d.sana, period)).reverse();
  const fmtBook = (n: number) => (bookCur === 'usd' ? `$${fmtUsd(n)}` : formatMoney(n));

  // Biletlar (qidiruv)
  const tickets = allTickets
    .filter((t) => inPeriod(t.sana, period))
    .filter((t) => !tixSearch || `${t.yolovchi} ${t.biletRaqam} ${t.airlineName}`.toLowerCase().includes(tixSearch.toLowerCase()))
    .sort((a, b) => ticketCreatedAtMs(b) - ticketCreatedAtMs(a));

  // Excel export — joriy davr (period) bo'yicha: Kirim-Chiqim, Kassa kitobi, Qarzdorlar.
  // xlsx dinamik yuklanadi (faqat bosilganda) — asosiy bundle kichik qoladi.
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Bilet raqami -> shu biletga kirgan jami pul (barcha to'lovlar, davrdan qat'i
      // nazar — bilet uchun keyin kirgan pul ham hisobga olinadi).
      const paidByTicket = new Map<string, number>();
      allPayments.forEach((p) => {
        if (p.biletRaqam) paidByTicket.set(p.biletRaqam, (paidByTicket.get(p.biletRaqam) || 0) + p.summa);
      });

      // 1. Kirim-Chiqim jurnali — to'liq maydonlar bilan (bilet raqami, mijoz, tur, valyuta, izoh)
      const movRows = movements.map((m) => {
        const p = m.payment;
        return {
          Sana: m.sana,
          Tur: MOV_META[m.kind].label,
          'Bilet raqami': p?.biletRaqam || '',
          Mijoz: p?.mijozIsmi || '',
          Tavsif: m.label + (m.sub ? ` · ${m.sub}` : ''),
          "To'lov turi": p?.tolovTuri || '',
          Valyuta: p ? (p.valyuta === 'usd' ? 'USD' : 'UZS') : '',
          'USD summa': p?.valyuta === 'usd' ? (p.summAsl ?? '') : '',
          Kurs: p?.valyuta === 'usd' ? (p.kurs ?? '') : '',
          "Yo'nalish": MOV_META[m.kind].sign > 0 ? 'Kirim' : 'Chiqim',
          'Summa (UZS)': MOV_META[m.kind].sign * m.summa,
          Izoh: p?.izoh || m.rasxod?.sabab || m.obmen?.izoh || m.inkas?.izoh || m.perevod?.izoh || '',
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movRows), 'Kirim-Chiqim');

      // 2. To'lovlar (prixodlar) — bilet raqami bo'yicha kirgan har bir summa
      const payRows = allPayments
        .filter((p) => inPeriod(p.sana, period))
        .sort((a, b) => ticketCreatedAtMs(b) - ticketCreatedAtMs(a))
        .map((p) => ({
          Sana: p.sana,
          'Bilet raqami': p.biletRaqam || '',
          Mijoz: p.mijozIsmi || '',
          "To'lov turi": p.tolovTuri,
          Valyuta: p.valyuta === 'usd' ? 'USD' : 'UZS',
          'USD summa': p.valyuta === 'usd' ? (p.summAsl ?? '') : '',
          Kurs: p.valyuta === 'usd' ? (p.kurs ?? '') : '',
          'Summa (UZS)': p.summa,
          Izoh: p.izoh || '',
        }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payRows), "To'lovlar");

      // 3. Biletlar — har bir bilet uchun sotish, KIRGAN (to'langan) va qolgan qarz
      const ticketRows = allTickets
        .filter((t) => inPeriod(t.sana, period))
        .sort((a, b) => ticketCreatedAtMs(b) - ticketCreatedAtMs(a))
        .map((t) => {
          const kirgan = paidByTicket.get(t.biletRaqam) || 0;
          return {
            Sana: t.sana,
            'Bilet raqami': t.biletRaqam,
            "Yo'lovchi": t.yolovchi,
            Aviakompaniya: t.airlineName,
            Tarif: t.tarif,
            'Sotish narxi': t.sotishNarxi,
            'Kirgan (to\'langan)': kirgan,
            Qarz: Math.max(0, t.sotishNarxi - kirgan),
          };
        });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ticketRows), 'Biletlar');

      // 4. Kassa kitobi (UZS) — kunlik ostatok
      const bookRows = uzsBook.filter((d) => inPeriod(d.sana, period)).map((d) => ({
        Sana: d.sana, 'Ostatok boshi': d.boshi, Kirim: d.kirim, Chiqim: d.chiqim, 'Ostatok oxiri': d.oxiri,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bookRows), 'Kassa kitobi UZS');

      // 5. Qarzdorlar (joriy davr biletlari bo'yicha)
      const debtRows = (debts as { biletRaqam: string; mijozIsmi: string; sotishNarxi: number; tolangan: number; qarz: number; sana: string }[]).map((d) => ({
        Bilet: d.biletRaqam, Mijoz: d.mijozIsmi, 'Sotish narxi': d.sotishNarxi, "To'langan": d.tolangan, Qarz: d.qarz, Sana: d.sana,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(debtRows), 'Qarzdorlar');

      XLSX.writeFile(wb, `Finansist-${periodLabel(period)}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const activeTab = TABS.find((t) => t.key === tab)!;

  // ===== UI helperlar =====
  const segBtn = (active: boolean, color: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, fontSize: 13.5,
    cursor: 'pointer', fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
    border: `1px solid ${active ? color : T.line}`, backgroundColor: active ? color + '18' : T.card, color: active ? color : T.mut,
  });

  return (
    <div>
      {/* Sarlavha + davr */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: T.text, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Finansist</h1>
          <div style={{ color: T.dim, fontSize: 12, marginTop: 4 }}>Davr: {periodLabel(period)}</div>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Opshiy balans: bilet yozildi ↔ pul kirdi ↔ qoldiq qarz (katta, qizil) */}
      <SotuvBalansCard period={period} />

      {/* Asosiy ko'rinish: Kassa | Hisobotlar + Excel export */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setView('kassa')} style={segBtn(view === 'kassa', T.blue)}><Wallet size={16} /> Kassa</button>
        <button onClick={() => setView('hisobot')} style={segBtn(view === 'hisobot', T.green)}><ReceiptText size={16} /> Hisobotlar</button>
        <button onClick={handleExport} disabled={exporting} title={`${periodLabel(period)} bo'yicha Excel'ga yuklab olish`}
          style={{ ...segBtn(false, T.teal), marginLeft: 'auto', color: T.teal, borderColor: T.teal + '60', cursor: exporting ? 'wait' : 'pointer', opacity: exporting ? 0.6 : 1 }}>
          <Download size={16} /> {exporting ? 'Tayyorlanmoqda…' : 'Excel yuklab olish'}
        </button>
      </div>

      {/* Ostatka strip — Kun boshi → Kun oxiri (UZS va USD) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 12, marginBottom: 18 }}>
        {/* UZS ostatka oqimi */}
        <div style={{ ...card, borderTop: `2px solid ${uzsOxiri >= 0 ? T.green : T.red}`, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.mut, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 14 }}>
            <Wallet size={15} style={{ color: uzsOxiri >= 0 ? T.green : T.red }} /> NAQD KASSA (OSTATOK)
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <div>
              <div style={{ color: T.dim, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 3 }}>KUN BOSHI</div>
              <div style={{ color: T.mut, fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(uzsBoshi)}</div>
            </div>
            <ArrowRight size={18} style={{ color: T.dim, marginBottom: 4, flexShrink: 0 }} />
            <div>
              <div style={{ color: T.dim, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 3 }}>KUN OXIRI</div>
              <div style={{ color: uzsOxiri >= 0 ? T.green : T.red, fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px', lineHeight: 1 }}>{formatMoney(uzsOxiri)}<span style={{ fontSize: 13, color: T.dim, fontWeight: 600 }}> so&apos;m</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
            <span style={{ color: T.blue, fontWeight: 600 }}>+{formatMoney(naqd)}</span><span style={{ color: T.dim }}>naqd</span>
            {obmenUzs > 0 && (<><span style={{ color: T.dim }}>+</span><span style={{ color: T.teal, fontWeight: 600 }}>{formatMoney(obmenUzs)}</span><span style={{ color: T.dim }}>obmen</span></>)}
            <span style={{ color: T.dim }}>−</span><span style={{ color: T.red, fontWeight: 600 }}>{formatMoney(jamiRasxod)}</span><span style={{ color: T.dim }}>rasxod</span>
            <span style={{ color: T.dim }}>−</span><span style={{ color: T.purple, fontWeight: 600 }}>{formatMoney(jamiInk)}</span><span style={{ color: T.dim }}>inkas.</span>
          </div>
          <div style={{ color: T.dim, fontSize: 11, marginTop: 8 }}>
            Karta/o&apos;tkazma bank hisobiga boradi (o&apos;ngdagi BANK kartasi).
          </div>
        </div>
        {/* BANK (schet) ostatka oqimi — plastik+perech + naqddan topshirilgan − perevodlar */}
        <div style={{ ...card, borderTop: `2px solid ${T.indigo}`, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.mut, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 14 }}>
            <Landmark size={15} style={{ color: T.indigo }} /> BANK HISOBI (SCHET)
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <div>
              <div style={{ color: T.dim, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 3 }}>KUN BOSHI</div>
              <div style={{ color: T.mut, fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(bankBoshi)}</div>
            </div>
            <ArrowRight size={18} style={{ color: T.dim, marginBottom: 4, flexShrink: 0 }} />
            <div>
              <div style={{ color: T.dim, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 3 }}>KUN OXIRI</div>
              <div style={{ color: T.indigo, fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px', lineHeight: 1 }}>{formatMoney(bankOxiri)}<span style={{ fontSize: 13, color: T.dim, fontWeight: 600 }}> so&apos;m</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
            <span style={{ color: T.blue, fontWeight: 600 }}>+{formatMoney(bankUzs)}</span><span style={{ color: T.dim }}>karta/o&apos;tkazma</span>
            {jamiKassaTopshirish > 0 && (<><span style={{ color: T.dim }}>+</span><span style={{ color: T.green, fontWeight: 600 }}>{formatMoney(jamiKassaTopshirish)}</span><span style={{ color: T.dim }}>naqddan</span></>)}
            {jamiPerevod > 0 && (<><span style={{ color: T.dim }}>−</span><span style={{ color: T.indigo, fontWeight: 600 }}>{formatMoney(jamiPerevod)}</span><span style={{ color: T.dim }}>perevod</span></>)}
          </div>
        </div>
        {/* USD ostatka oqimi */}
        <div style={{ ...card, borderTop: `2px solid ${T.blue}`, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.mut, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 14 }}>
            <DollarSign size={15} style={{ color: T.blue }} /> USD OSTATKA
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <div>
              <div style={{ color: T.dim, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 3 }}>KUN BOSHI</div>
              <div style={{ color: T.mut, fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>${fmtUsd(usdBoshi)}</div>
            </div>
            <ArrowRight size={18} style={{ color: T.dim, marginBottom: 4, flexShrink: 0 }} />
            <div>
              <div style={{ color: T.dim, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 3 }}>KUN OXIRI</div>
              <div style={{ color: T.blue, fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px', lineHeight: 1 }}>${fmtUsd(usdOxiri)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.dim, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.line}`, flexWrap: 'wrap' }}>
            <ArrowLeftRight size={13} />
            <span style={{ color: T.blue, fontWeight: 600 }}>+${fmtUsd(usdKirim)}</span> kirim
            {obmenUsd > 0 && (<>· <span style={{ color: T.teal, fontWeight: 600 }}>−${fmtUsd(obmenUsd)}</span> obmen</>)}
          </div>
        </div>
      </div>

      {view === 'kassa' ? (
        <div className="split-2">
          {/* Chap: kiritish formasi (entry) */}
          <div style={{ ...card, borderTop: `2px solid ${activeTab.color}50`, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}`, position: 'relative', overflowX: 'auto' }}>
              {TABS.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '14px 20px', border: 'none',
                  cursor: 'pointer', color: tab === t.key ? t.color : T.mut, fontSize: 13.5, fontWeight: tab === t.key ? 800 : 600,
                  whiteSpace: 'nowrap', borderBottom: `2.5px solid ${tab === t.key ? t.color : 'transparent'}`, marginBottom: -1,
                  backgroundColor: tab === t.key ? t.color + '14' : 'transparent', transition: 'all 0.15s ease',
                }}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
            <div style={{ padding: 22 }}>
              <h3 style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: activeTab.color }}>{activeTab.icon}</span>
                {tab === 'prixod' ? 'Yangi Prixod' : tab === 'rasxod' ? 'Rasxod (Chiqim)' : tab === 'obmen' ? 'Obmen — USD ni som ga' : tab === 'inkassatsiya' ? 'Inkassatsiya' : 'Perevod (bankdan chiqim)'}
              </h3>
              {tab === 'prixod' && <PaymentForm onSuccess={refreshAll} tickets={allTickets} payments={allPayments} />}
              {tab === 'rasxod' && <RasxodForm onSuccess={refreshAll} />}
              {tab === 'obmen' && <ObmenForm onSuccess={refreshAll} usdMavjud={usdOxiri} />}
              {tab === 'inkassatsiya' && <InkassatsiyaTab onSuccess={refreshAll} />}
              {tab === 'perevod' && <PerevodTab onSuccess={refreshAll} />}
            </div>
          </div>

          {/* O'ng: kunlik ko'rsatkichlar + naqd sverka */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: 'Naqd', value: naqd, color: T.green, icon: <Banknote size={18} /> },
                { label: 'Plastik', value: plastik, color: T.blue, icon: <Smartphone size={18} /> },
                { label: 'Perechisl.', value: perechisleniya, color: T.purple, icon: <Building2 size={18} /> },
              ].map((item) => (
                <div key={item.label} style={{ ...card, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ color: item.color, marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
                  <div style={{ color: T.dim, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>{item.label.toUpperCase()}</div>
                  <div style={{ color: item.color, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(item.value)}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'RASXOD', value: jamiRasxod, color: T.red },
                { label: 'INKAS.', value: jamiInk, color: T.purple },
              ].map((x) => (
                <div key={x.label} style={{ ...card, padding: '12px 14px', borderColor: x.color + '25' }}>
                  <div style={{ color: T.dim, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em' }}>{x.label}</div>
                  <div style={{ color: x.color, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>−{formatMoney(x.value)}</div>
                </div>
              ))}
            </div>

            {/* Naqd sverka */}
            <div style={{ ...card, padding: 18 }}>
              <h3 style={{ color: T.text, fontSize: 14, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calculator size={16} style={{ color: T.blue }} /> Naqd Sverka (UZS)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Sanalgan naqd (qo&apos;lda)</label>
                  <input type="number" value={sanalganNaqd} onChange={(e) => setSanalganNaqd(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Kutilgan naqd (tizim)</label>
                  <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: T.mut }}>{formatMoney(kutilganNaqd)}</div>
                </div>
              </div>
              {farq !== null && (
                <div style={{
                  padding: '10px 14px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                  backgroundColor: farq === 0 ? '#7CFF4F12' : '#FF5C5C12', border: `1px solid ${farq === 0 ? T.green + '30' : T.red + '30'}`,
                  color: farq === 0 ? T.green : T.red, display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>{farq === 0 ? '✓ To\'g\'ri keladi' : farq > 0 ? 'Ortiqcha' : 'Kam'}</span>
                  <span>{farq > 0 ? '+' : ''}{formatMoney(farq)} so&apos;m</span>
                </div>
              )}
              <div style={{ color: T.dim, fontSize: 11, marginTop: 10 }}>Kutilgan = Naqd − Rasxod − Kassa topshirish</div>
            </div>

            {/* To'langan biletlar */}
            <div style={{ ...card, padding: '14px 18px', borderColor: T.green + '25', display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle2 size={20} style={{ color: T.green, flexShrink: 0 }} />
              <div>
                <div style={{ color: T.dim, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em' }}>TO&apos;LANGAN BILETLAR (qarz yopilgan)</div>
                <div style={{ color: T.green, fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{settledCount} ta</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ===== HISOBOTLAR ko'rinishi ===== */
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {([
              { k: 'jurnal' as const, l: 'Kirim-Chiqim', icon: <ArrowLeftRight size={15} /> },
              { k: 'kitob' as const, l: 'Kassa kitobi', icon: <BookOpen size={15} /> },
              { k: 'qarz' as const, l: 'Qarzdorlar', icon: <Users size={15} /> },
              { k: 'biletlar' as const, l: 'Biletlar', icon: <Plane size={15} /> },
            ]).map((r) => (
              <button key={r.k} onClick={() => setReport(r.k)} style={segBtn(report === r.k, T.green)}>{r.icon}{r.l}</button>
            ))}
          </div>

          {/* Kassa kitobi */}
          {report === 'kitob' && (
            <div style={{ ...card, padding: 20, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={16} style={{ color: T.green }} /> Kassa kitobi — kunlik ostatok
                </h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['uzs', 'usd'] as const).map((c) => (
                    <button key={c} onClick={() => setBookCur(c)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: bookCur === c ? 700 : 500, cursor: 'pointer', border: `1px solid ${bookCur === c ? T.blue : T.line}`, backgroundColor: bookCur === c ? T.blue + '18' : 'transparent', color: bookCur === c ? T.blue : T.mut }}>{c.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              {bookShown.length === 0 ? (
                <div style={{ color: T.dim, textAlign: 'center', padding: '28px 0', fontSize: 13 }}>Ma&apos;lumot yo&apos;q</div>
              ) : (
                <div style={{ maxHeight: '58vh', overflowY: 'auto', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                    <thead><tr>
                      <th style={thStyle}>Sana</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Ostatok boshi</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Kirim</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Chiqim</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Ostatok oxiri</th>
                    </tr></thead>
                    <tbody>
                      {bookShown.map((d) => (
                        <tr key={d.sana} style={{ borderBottom: `1px solid ${T.line}` }}>
                          <td style={{ padding: '9px 12px', color: T.text, fontSize: 12.5, fontWeight: 600 }}>{d.sana}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', color: T.mut, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{fmtBook(d.boshi)}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', color: T.blue, fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>+{fmtBook(d.kirim)}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', color: T.red, fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{d.chiqim ? '−' + fmtBook(d.chiqim) : <span style={{ color: T.dim }}>—</span>}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', color: d.oxiri >= 0 ? T.green : T.red, fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtBook(d.oxiri)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Kirim-Chiqim jurnali */}
          {report === 'jurnal' && (
            <div style={{ ...card, padding: 20, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowLeftRight size={16} style={{ color: T.blue }} /> Kirim-Chiqim — {periodLabel(period)}
                </h3>
                <span style={{ color: T.dim, fontSize: 11, fontWeight: 600 }}>{movShown.length} ta</span>
              </div>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.dim }} />
                <input value={movSearch} onChange={(e) => setMovSearch(e.target.value)} placeholder="Qidirish: mijoz, bilet, izoh, sana…" style={{ ...inputStyle, paddingLeft: 34 }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {([
                  { k: 'all' as const, l: 'Hammasi', c: T.mut },
                  { k: 'prixod' as const, l: 'Prixod', c: T.blue },
                  { k: 'rasxod' as const, l: 'Rasxod', c: T.red },
                  { k: 'obmen' as const, l: 'Obmen', c: T.teal },
                  { k: 'inkas' as const, l: 'Inkas.', c: T.purple },
                  { k: 'perevod' as const, l: 'Perevod', c: T.indigo },
                ]).map((f) => {
                  const on = movFilter === f.k;
                  return <button key={f.k} onClick={() => setMovFilter(f.k)} style={{ padding: '5px 11px', borderRadius: 7, fontSize: 11, fontWeight: on ? 700 : 500, cursor: 'pointer', border: `1px solid ${on ? f.c : T.line}`, backgroundColor: on ? f.c + '18' : 'transparent', color: on ? f.c : T.dim }}>{f.l}</button>;
                })}
              </div>
              {movShown.length === 0 ? (
                <div style={{ color: T.dim, textAlign: 'center', padding: '28px 0', fontSize: 13 }}>Harakat yo&apos;q</div>
              ) : (
                <div style={{ maxHeight: '54vh', overflowY: 'auto', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                    <thead><tr>
                      <th style={thStyle}>Sana</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Tur</th>
                      <th style={thStyle}>Tavsif</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Summa</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Amal</th>
                    </tr></thead>
                    <tbody>
                      {movShown.map((m) => {
                        const meta = MOV_META[m.kind];
                        const remaining = ticketEditRemainingMs(m, now);
                        const editable = true; // barcha harakatlar 48 soat ichida tahrirlanadi
                        const canEdit = editable && remaining > 0;
                        const soat = Math.floor(remaining / 3600000);
                        const openEdit = () => {
                          if (m.kind === 'prixod') setEditPayment(m.payment!);
                          else if (m.kind === 'rasxod') setEditRasxod(m.rasxod!);
                          else if (m.kind === 'obmen') setEditObmen(m.obmen!);
                          else if (m.kind === 'inkas') setEditInk(m.inkas!);
                          else if (m.kind === 'perevod') setEditPerevod(m.perevod!);
                        };
                        return (
                          <tr key={m.id} onMouseEnter={() => setHover(m.id)} onMouseLeave={() => setHover(null)} style={{ borderBottom: `1px solid ${T.line}`, backgroundColor: hover === m.id ? '#1E2E2450' : 'transparent' }}>
                            <td style={{ padding: '8px 12px', color: T.mut, fontSize: 12 }}>{m.sana}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, backgroundColor: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}30` }}>{meta.label}</span>
                            </td>
                            <td style={{ padding: '8px 12px', color: T.text, fontSize: 12.5 }}>{m.label}{m.sub ? <span style={{ color: T.dim, fontSize: 11 }}> · {m.sub}</span> : null}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: meta.color }}>{meta.sign > 0 ? '+' : '−'}{formatMoney(m.summa)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              {editable ? (
                                canEdit ? (
                                  <button onClick={openEdit} title={`${soat} soat ichida tahrirlash mumkin`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', backgroundColor: '#F5A62318', color: T.orange, border: `1px solid ${T.orange}40` }}>
                                    <Pencil size={10} /> {soat}s
                                  </button>
                                ) : <span title="48 soatlik muddat tugagan" style={{ display: 'inline-flex', alignItems: 'center', color: T.dim }}><Lock size={12} /></span>
                              ) : <span style={{ color: '#2A3A30', fontSize: 11 }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Qarzdorlar */}
          {report === 'qarz' && <AviaDebtTable debts={debts} />}

          {/* Biletlar jadvali */}
          {report === 'biletlar' && (
            <div style={{ ...card, padding: 20, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plane size={16} style={{ color: T.orange }} /> Biletlar — {periodLabel(period)}
                </h3>
                <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.dim }} />
                  <input value={tixSearch} onChange={(e) => setTixSearch(e.target.value)} placeholder="Yo'lovchi yoki bilet…" style={{ ...inputStyle, paddingLeft: 34 }} />
                </div>
              </div>
              {tickets.length === 0 ? (
                <div style={{ color: T.dim, textAlign: 'center', padding: '28px 0', fontSize: 13 }}>{tixSearch ? 'Topilmadi' : 'Bilet yo\'q'}</div>
              ) : (
                <div style={{ maxHeight: '58vh', overflowY: 'auto', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                    <thead><tr>
                      <th style={thStyle}>Sana</th>
                      <th style={thStyle}>Bilet</th>
                      <th style={thStyle}>Yo&apos;lovchi</th>
                      <th style={thStyle}>Aviakompaniya</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Tarif</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Sotish narxi</th>
                    </tr></thead>
                    <tbody>
                      {tickets.map((t) => (
                        <tr key={t.id} style={{ borderBottom: `1px solid ${T.line}` }}>
                          <td style={{ padding: '8px 12px', color: T.mut, fontSize: 12 }}>{t.sana}</td>
                          <td style={{ padding: '8px 12px', color: T.text, fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>{t.biletRaqam}</td>
                          <td style={{ padding: '8px 12px', color: T.text, fontSize: 13 }}>{t.yolovchi}</td>
                          <td style={{ padding: '8px 12px', color: T.mut, fontSize: 12.5 }}>{t.airlineName}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: T.mut, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(t.tarif)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: T.green, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(t.sotishNarxi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {editPayment && <PaymentEditModal payment={editPayment} onClose={() => setEditPayment(null)} onSaved={refreshAll} />}
      {editRasxod && <RasxodEditModal rasxod={editRasxod} onClose={() => setEditRasxod(null)} onSaved={refreshAll} />}
      {editObmen && <ObmenEditModal obmen={editObmen} onClose={() => setEditObmen(null)} onSaved={refreshAll} />}
      {editInk && <InkassatsiyaEditModal inkas={editInk} onClose={() => setEditInk(null)} onSaved={refreshAll} />}
      {editPerevod && <PerevodEditModal perevod={editPerevod} onClose={() => setEditPerevod(null)} onSaved={refreshAll} />}
    </div>
  );
}
