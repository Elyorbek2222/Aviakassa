'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  Banknote, Smartphone, Building2, ArrowUpRight, ArrowDownRight,
  TrendingDown, CheckCircle2, Landmark, Calculator, Pencil, Lock, X,
  Wallet, DollarSign, BookOpen, ArrowLeftRight, Users, Plane, Search, ReceiptText,
} from 'lucide-react';
import { formatMoney, ticketEditRemainingMs, ticketCreatedAtMs } from '@/lib/utils';
import { AIRLINE_LABELS, type PaymentType, type Valyuta, type AirlineKey, type AviaPayment, type Rasxod, type AviaTicket } from '@/types/avia';
import AviaDebtTable from '@/components/avia/AviaDebtTable';
import RasxodForm from '@/components/avia/RasxodForm';
import RefundForm from '@/components/avia/RefundForm';
import PeriodFilter from '@/components/avia/PeriodFilter';
import { periodQuery, periodLabel, inPeriod } from '@/lib/period';
import { inputStyle, labelStyle, MessageBox } from '@/components/avia/formStyles';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ===== Tema tokenlari =====
const T = {
  bg: '#0A0F0D', card: '#141F19', line: '#1E2E24', mut: '#8A9A8F', dim: '#4A5C50',
  text: '#fff', green: '#7CFF4F', blue: '#2CA5E0', red: '#FF5C5C', orange: '#F5A623', purple: '#9B59B6',
};
const ACCENT = T.blue;
const card: React.CSSProperties = { backgroundColor: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 20 };
const fmtUsd = (n: number) => n.toLocaleString('en-US');

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/avia/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          mijozIsmi: form.mijozIsmi || (form.valyuta === 'usd' && !form.biletRaqam ? 'Obmen' : form.mijozIsmi),
          summAsl: form.valyuta === 'usd' ? Number(form.summAsl) : undefined,
          kurs: form.valyuta === 'usd' ? Number(form.kurs) : undefined,
          summa: Number(form.summa),
        }),
      });

      if (res.ok) {
        setMessage("To'lov saqlandi!");
        setForm({ biletRaqam: '', mijozIsmi: '', valyuta: 'uzs', summAsl: '', kurs: '', summa: '', tolovTuri: 'naqd', izoh: '' });
        onSuccess();
      } else {
        setMessage('Xatolik yuz berdi');
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
          <input type="text" value={form.biletRaqam} onChange={(e) => setForm({ ...form, biletRaqam: e.target.value })} placeholder="Bo'sh = Obmen" style={inputStyle} />
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Bilet Raqami</label>
          <input type="text" value={form.biletRaqam} onChange={(e) => setForm({ ...form, biletRaqam: e.target.value })} placeholder="001-1234567890" style={inputStyle} />
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Mijoz Ismi</label>
        <input type="text" value={form.mijozIsmi} onChange={(e) => setForm({ ...form, mijozIsmi: e.target.value })} placeholder={form.valyuta === 'usd' && !form.biletRaqam ? 'Obmen' : 'Familiya Ism'} style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Valyuta</label>
          <select value={form.valyuta} onChange={(e) => setForm({ ...form, valyuta: e.target.value as Valyuta })} style={inputStyle}>
            <option value="uzs">UZS</option>
            <option value="usd">USD</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>To&apos;lov turi</label>
          <select value={form.tolovTuri} onChange={(e) => setForm({ ...form, tolovTuri: e.target.value as PaymentType })} style={inputStyle}>
            <option value="naqd">Naqd</option>
            <option value="plastik">Plastik</option>
            <option value="perechisleniya">Perechisleniya</option>
          </select>
        </div>
      </div>
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
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Summa (UZS)</label>
        <input type="number" value={form.summa} onChange={(e) => setForm({ ...form, summa: e.target.value })} placeholder="0" required style={inputStyle} />
      </div>
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
  { key: 'refund' as const, label: 'Refund', color: T.orange, icon: <TrendingDown size={14} /> },
  { key: 'inkassatsiya' as const, label: 'Inkassatsiya', color: T.purple, icon: <Landmark size={14} /> },
];

type TabKey = 'prixod' | 'rasxod' | 'refund' | 'inkassatsiya';
type ViewKey = 'kassa' | 'hisobot';
type ReportKey = 'kitob' | 'jurnal' | 'qarz' | 'biletlar';

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', color: T.dim, fontSize: 11, fontWeight: 600,
  letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: `1px solid ${T.line}`,
  position: 'sticky', top: 0, backgroundColor: '#0E1611', zIndex: 1,
};

export default function FinansistPage() {
  const [view, setView] = useState<ViewKey>('kassa');
  const [report, setReport] = useState<ReportKey>('kitob');
  const [bookCur, setBookCur] = useState<Valyuta>('uzs');
  const [tab, setTab] = useState<TabKey>('prixod');
  const [hover, setHover] = useState<string | null>(null);
  const [period, setPeriod] = useState('today');
  const [sanalganNaqd, setSanalganNaqd] = useState('');
  const [editPayment, setEditPayment] = useState<AviaPayment | null>(null);
  const [editRasxod, setEditRasxod] = useState<Rasxod | null>(null);
  const [movFilter, setMovFilter] = useState<'all' | 'prixod' | 'rasxod' | 'refund' | 'inkas'>('all');
  const [movSearch, setMovSearch] = useState('');
  const [tixSearch, setTixSearch] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);

  const { data: paymentsData, mutate: mutatePayments } = useSWR('/api/avia/payments', fetcher, { refreshInterval: 60000 });
  const { data: rasxodData, mutate: mutateRasxod } = useSWR('/api/avia/rasxod', fetcher, { refreshInterval: 60000 });
  const { data: refundData, mutate: mutateRefund } = useSWR('/api/avia/refund', fetcher, { refreshInterval: 60000 });
  const { data: inkData, mutate: mutateInk } = useSWR('/api/avia/inkassatsiya', fetcher, { refreshInterval: 60000 });
  const { data: ticketsData } = useSWR('/api/avia/tickets', fetcher, { refreshInterval: 60000 });
  const { data: reportsData, mutate: mutateReports } = useSWR(`/api/avia/reports${periodQuery(period)}`, fetcher, { refreshInterval: 60000 });

  // Hammasi (kassa kitobi/kümülatив hisob uchun) va davrga filtrlangani
  const allPayments = (paymentsData?.payments || []) as AviaPayment[];
  const allRasxod = (rasxodData?.rasxodlar || []) as Rasxod[];
  const allRefund = (refundData?.refundlar || []) as { id: string; sana: string; summa: number; mijozIsmi?: string; biletRaqam?: string }[];
  const allInk = (inkData?.inkassatsiya || []) as { id: string; sana: string; summa: number; turi?: string; airlineName?: string }[];
  const allTickets = (ticketsData?.tickets || []) as AviaTicket[];
  const payments = allPayments.filter((p) => inPeriod(p.sana, period));
  const rasxodlar = allRasxod.filter((r) => inPeriod(r.sana, period));
  const refundlar = allRefund.filter((r) => inPeriod(r.sana, period));
  const inkPeriod = allInk.filter((i) => inPeriod(i.sana, period));

  const debts = reportsData?.debts || [];
  const settledCount = reportsData?.kpi?.settledCount ?? 0;

  // ===== Logika: UZS va USD alohida hisoblanadi =====
  const uzsPay = payments.filter((p) => p.valyuta !== 'usd');
  const usdPay = payments.filter((p) => p.valyuta === 'usd');
  const byType = (arr: AviaPayment[], tt: PaymentType) => arr.filter((p) => p.tolovTuri === tt).reduce((s, p) => s + p.summa, 0);
  const naqd = byType(uzsPay, 'naqd');
  const plastik = byType(uzsPay, 'plastik');
  const perechisleniya = byType(uzsPay, 'perechisleniya');
  const uzsPrixod = naqd + plastik + perechisleniya;
  const usdKirim = usdPay.reduce((s, p) => s + (p.summAsl || 0), 0);

  const jamiRasxod = rasxodlar.reduce((s, r) => s + r.summa, 0);
  const jamiRefund = refundlar.reduce((s, r) => s + r.summa, 0);
  const jamiInk = inkPeriod.reduce((s, i) => s + i.summa, 0);
  const jamiKassaTopshirish = inkPeriod.filter((i) => i.turi === 'kassa').reduce((s, i) => s + i.summa, 0);
  const uzsOstatka = uzsPrixod - jamiRasxod - jamiRefund - jamiInk;

  // Naqd sverka (UZS): kutilgan naqd = UZS naqd kirim − rasxod − refund − kassa topshirish
  const kutilganNaqd = naqd - jamiRasxod - jamiRefund - jamiKassaTopshirish;
  const farq = sanalganNaqd === '' ? null : Number(sanalganNaqd) - kutilganNaqd;

  const refreshAll = () => { mutatePayments(); mutateRasxod(); mutateRefund(); mutateInk(); mutateReports(); };

  // ===== Birlashgan Kirim-Chiqim jurnali =====
  type Mov = { id: string; kind: 'prixod' | 'rasxod' | 'refund' | 'inkas'; sana: string; summa: number; label: string; sub?: string; payment?: AviaPayment; rasxod?: Rasxod };
  const movements: Mov[] = [
    ...payments.map((p) => ({ id: p.id, kind: 'prixod' as const, sana: p.sana, summa: p.summa, label: p.mijozIsmi || p.biletRaqam || '—', sub: `${p.tolovTuri}${p.valyuta === 'usd' ? ` · $${fmtUsd(p.summAsl || 0)}` : ''}`, payment: p })),
    ...rasxodlar.map((r) => ({ id: r.id, kind: 'rasxod' as const, sana: r.sana, summa: r.summa, label: r.sabab || 'Rasxod', rasxod: r })),
    ...refundlar.map((r) => ({ id: r.id, kind: 'refund' as const, sana: r.sana, summa: r.summa, label: r.mijozIsmi || r.biletRaqam || 'Refund' })),
    ...inkPeriod.map((i) => ({ id: i.id, kind: 'inkas' as const, sana: i.sana, summa: i.summa, label: i.turi === 'kassa' ? 'Kassa topshirish' : (i.airlineName || 'Inkassatsiya') })),
  ].sort((a, b) => ticketCreatedAtMs(b) - ticketCreatedAtMs(a));
  const movShown = movements.filter((m) => {
    if (movFilter !== 'all' && m.kind !== movFilter) return false;
    if (movSearch && !(`${m.label} ${m.sub || ''} ${m.sana}`).toLowerCase().includes(movSearch.toLowerCase())) return false;
    return true;
  });
  const MOV_META: Record<Mov['kind'], { label: string; color: string; sign: number }> = {
    prixod: { label: 'Prixod', color: T.blue, sign: 1 },
    rasxod: { label: 'Rasxod', color: T.red, sign: -1 },
    refund: { label: 'Refund', color: T.orange, sign: -1 },
    inkas: { label: 'Inkas.', color: T.purple, sign: -1 },
  };

  // ===== Kassa kitobi (valyuta bo'yicha): kunlik ostatok boshi/oxiri =====
  const buildBook = (inflowOf: (p: AviaPayment) => number, withOutflow: boolean) => {
    const dm = new Map<string, { kirim: number; chiqim: number }>();
    const bump = (sana: string, kirim: number, chiqim: number) => {
      const e = dm.get(sana) || { kirim: 0, chiqim: 0 };
      e.kirim += kirim; e.chiqim += chiqim; dm.set(sana, e);
    };
    allPayments.forEach((p) => bump(p.sana, inflowOf(p), 0));
    if (withOutflow) {
      allRasxod.forEach((r) => bump(r.sana, 0, r.summa));
      allRefund.forEach((r) => bump(r.sana, 0, r.summa));
      allInk.forEach((i) => bump(i.sana, 0, i.summa));
    }
    const days = [...dm.keys()].sort();
    return days.map((sana, idx) => {
      const boshi = days.slice(0, idx).reduce((s, dd) => { const e = dm.get(dd)!; return s + e.kirim - e.chiqim; }, 0);
      const { kirim, chiqim } = dm.get(sana)!;
      return { sana, boshi, kirim, chiqim, oxiri: boshi + kirim - chiqim };
    });
  };
  const uzsBook = buildBook((p) => (p.valyuta === 'usd' ? 0 : p.summa), true);
  const usdBook = buildBook((p) => (p.valyuta === 'usd' ? (p.summAsl || 0) : 0), false);
  const bookShown = (bookCur === 'usd' ? usdBook : uzsBook).filter((d) => inPeriod(d.sana, period)).reverse();
  const fmtBook = (n: number) => (bookCur === 'usd' ? `$${fmtUsd(n)}` : formatMoney(n));

  // Biletlar (qidiruv)
  const tickets = allTickets
    .filter((t) => inPeriod(t.sana, period))
    .filter((t) => !tixSearch || `${t.yolovchi} ${t.biletRaqam} ${t.airlineName}`.toLowerCase().includes(tixSearch.toLowerCase()))
    .sort((a, b) => ticketCreatedAtMs(b) - ticketCreatedAtMs(a));

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

      {/* Asosiy ko'rinish: Kassa | Hisobotlar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={() => setView('kassa')} style={segBtn(view === 'kassa', T.blue)}><Wallet size={16} /> Kassa</button>
        <button onClick={() => setView('hisobot')} style={segBtn(view === 'hisobot', T.green)}><ReceiptText size={16} /> Hisobotlar</button>
      </div>

      {/* Ostatka strip — UZS va USD (har ikkala ko'rinishda) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 18 }}>
        <div style={{ ...card, borderTop: `2px solid ${uzsOstatka >= 0 ? T.green : T.red}`, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.mut, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}>
              <Wallet size={15} style={{ color: uzsOstatka >= 0 ? T.green : T.red }} /> UZS OSTATKA
            </div>
            <span style={{ color: uzsOstatka >= 0 ? T.green : T.red, fontSize: 12, fontWeight: 600 }}>{uzsOstatka >= 0 ? 'Musbat' : 'Manfiy'}</span>
          </div>
          <div style={{ color: uzsOstatka >= 0 ? T.green : T.red, fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 10 }}>{formatMoney(uzsOstatka)} so&apos;m</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, flexWrap: 'wrap' }}>
            <span style={{ color: T.blue, fontWeight: 600 }}>+{formatMoney(uzsPrixod)}</span><span style={{ color: T.dim }}>prixod</span>
            <span style={{ color: T.dim }}>−</span><span style={{ color: T.red, fontWeight: 600 }}>{formatMoney(jamiRasxod)}</span><span style={{ color: T.dim }}>rasxod</span>
            <span style={{ color: T.dim }}>−</span><span style={{ color: T.orange, fontWeight: 600 }}>{formatMoney(jamiRefund)}</span><span style={{ color: T.dim }}>refund</span>
            <span style={{ color: T.dim }}>−</span><span style={{ color: T.purple, fontWeight: 600 }}>{formatMoney(jamiInk)}</span><span style={{ color: T.dim }}>inkas.</span>
          </div>
        </div>
        <div style={{ ...card, borderTop: `2px solid ${T.blue}`, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.mut, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>
            <DollarSign size={15} style={{ color: T.blue }} /> USD OSTATKA (kassada)
          </div>
          <div style={{ color: T.blue, fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 10 }}>${fmtUsd(usdKirim)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.dim }}>
            <ArrowLeftRight size={13} /> {usdPay.length} ta USD operatsiya / obmen
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
                  display: 'flex', alignItems: 'center', gap: 6, padding: '12px 18px', background: 'none', border: 'none',
                  cursor: 'pointer', color: tab === t.key ? t.color : T.dim, fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
                  whiteSpace: 'nowrap', borderBottom: `2px solid ${tab === t.key ? t.color : 'transparent'}`, marginBottom: -1,
                }}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
            <div style={{ padding: 22 }}>
              <h3 style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: activeTab.color }}>{activeTab.icon}</span>
                {tab === 'prixod' ? 'Yangi Prixod / Obmen' : tab === 'rasxod' ? 'Rasxod (Chiqim)' : tab === 'refund' ? 'Refund (Pul qaytarish)' : 'Inkassatsiya'}
              </h3>
              {tab === 'prixod' && <PaymentForm onSuccess={refreshAll} />}
              {tab === 'rasxod' && <RasxodForm onSuccess={refreshAll} />}
              {tab === 'refund' && <RefundForm onSuccess={refreshAll} />}
              {tab === 'inkassatsiya' && <InkassatsiyaTab onSuccess={refreshAll} />}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: 'RASXOD', value: jamiRasxod, color: T.red },
                { label: 'REFUND', value: jamiRefund, color: T.orange },
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
              <div style={{ color: T.dim, fontSize: 11, marginTop: 10 }}>Kutilgan = Naqd − Rasxod − Refund − Kassa topshirish</div>
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
              { k: 'kitob' as const, l: 'Kassa kitobi', icon: <BookOpen size={15} /> },
              { k: 'jurnal' as const, l: 'Kirim-Chiqim', icon: <ArrowLeftRight size={15} /> },
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
                      {bookCur === 'uzs' && <th style={{ ...thStyle, textAlign: 'right' }}>Chiqim</th>}
                      <th style={{ ...thStyle, textAlign: 'right' }}>Ostatok oxiri</th>
                    </tr></thead>
                    <tbody>
                      {bookShown.map((d) => (
                        <tr key={d.sana} style={{ borderBottom: `1px solid ${T.line}` }}>
                          <td style={{ padding: '9px 12px', color: T.text, fontSize: 12.5, fontWeight: 600 }}>{d.sana}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', color: T.mut, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{fmtBook(d.boshi)}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', color: T.blue, fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>+{fmtBook(d.kirim)}</td>
                          {bookCur === 'uzs' && <td style={{ padding: '9px 12px', textAlign: 'right', color: T.red, fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>−{fmtBook(d.chiqim)}</td>}
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
                  { k: 'refund' as const, l: 'Refund', c: T.orange },
                  { k: 'inkas' as const, l: 'Inkas.', c: T.purple },
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
                        const canEdit = (m.kind === 'prixod' || m.kind === 'rasxod') && remaining > 0;
                        const soat = Math.floor(remaining / 3600000);
                        return (
                          <tr key={m.id} onMouseEnter={() => setHover(m.id)} onMouseLeave={() => setHover(null)} style={{ borderBottom: `1px solid ${T.line}`, backgroundColor: hover === m.id ? '#1E2E2450' : 'transparent' }}>
                            <td style={{ padding: '8px 12px', color: T.mut, fontSize: 12 }}>{m.sana}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, backgroundColor: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}30` }}>{meta.label}</span>
                            </td>
                            <td style={{ padding: '8px 12px', color: T.text, fontSize: 12.5 }}>{m.label}{m.sub ? <span style={{ color: T.dim, fontSize: 11 }}> · {m.sub}</span> : null}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: meta.color }}>{meta.sign > 0 ? '+' : '−'}{formatMoney(m.summa)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              {(m.kind === 'prixod' || m.kind === 'rasxod') ? (
                                canEdit ? (
                                  <button onClick={() => (m.kind === 'prixod' ? setEditPayment(m.payment!) : setEditRasxod(m.rasxod!))} title={`${soat} soat ichida tahrirlash mumkin`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', backgroundColor: '#F5A62318', color: T.orange, border: `1px solid ${T.orange}40` }}>
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
    </div>
  );
}
