'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  Banknote, Smartphone, Building2, ArrowUpRight, ArrowDownRight,
  TrendingDown, TrendingUp, CheckCircle2, Landmark, Calculator, Pencil, Lock, X,
} from 'lucide-react';
import { formatMoney, ticketEditRemainingMs, ticketCreatedAtMs } from '@/lib/utils';
import { AIRLINE_LABELS, type PaymentType, type Valyuta, type AirlineKey, type AviaPayment, type Rasxod } from '@/types/avia';
import AviaDebtTable from '@/components/avia/AviaDebtTable';
import RasxodForm from '@/components/avia/RasxodForm';
import RefundForm from '@/components/avia/RefundForm';
import PeriodFilter from '@/components/avia/PeriodFilter';
import { periodQuery, periodLabel, inPeriod } from '@/lib/period';
import { inputStyle, labelStyle, MessageBox } from '@/components/avia/formStyles';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ACCENT = '#2CA5E0';

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
      {/* Turi toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([
          { key: 'aviakompaniya' as const, label: 'Aviakompaniyaga' },
          { key: 'kassa' as const, label: 'Kassa topshirish' },
        ]).map((opt) => (
          <button type="button" key={opt.key} onClick={() => setTuri(opt.key)} style={{
            flex: 1, padding: '9px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${turi === opt.key ? '#9B59B6' : '#1E2E24'}`,
            backgroundColor: turi === opt.key ? '#9B59B618' : 'transparent',
            color: turi === opt.key ? '#9B59B6' : '#4A5C50',
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
        width: '100%', padding: '12px 20px', borderRadius: 9, border: '1px solid #9B59B6',
        backgroundColor: '#9B59B618', color: '#9B59B6', fontSize: 14, fontWeight: 700,
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
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, backgroundColor: '#141F19', border: '1px solid #1E2E24', borderTop: `2px solid ${accent}`, borderRadius: 14, padding: 24, marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pencil size={18} style={{ color: accent }} /> {title}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8A9A8F', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
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
    <ModalShell title="Prixodni tahrirlash" accent="#2CA5E0" onClose={onClose}>
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
        <SaveButtons loading={loading} accent="#2CA5E0" onClose={onClose} />
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
    <ModalShell title="Rasxodni tahrirlash" accent="#FF5C5C" onClose={onClose}>
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
        <SaveButtons loading={loading} accent="#FF5C5C" onClose={onClose} />
      </form>
    </ModalShell>
  );
}

function SaveButtons({ loading, accent, onClose }: { loading: boolean; accent: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #1E2E24', backgroundColor: 'transparent', color: '#8A9A8F', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Bekor qilish</button>
      <button type="submit" disabled={loading} style={{ flex: 2, padding: 12, borderRadius: 8, border: 'none', backgroundColor: accent, color: '#0A0F0D', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Saqlanmoqda...' : "O'zgartirishni saqlash"}
      </button>
    </div>
  );
}

const TABS = [
  { key: 'prixod' as const, label: 'Prixod', color: '#2CA5E0', icon: <ArrowUpRight size={14} /> },
  { key: 'rasxod' as const, label: 'Rasxod', color: '#FF5C5C', icon: <ArrowDownRight size={14} /> },
  { key: 'refund' as const, label: 'Refund', color: '#F5A623', icon: <TrendingDown size={14} /> },
  { key: 'inkassatsiya' as const, label: 'Inkassatsiya', color: '#9B59B6', icon: <Landmark size={14} /> },
];

type TabKey = 'prixod' | 'rasxod' | 'refund' | 'inkassatsiya';

export default function FinansistPage() {
  const [tab, setTab] = useState<TabKey>('prixod');
  const [tableRowHover, setTableRowHover] = useState<string | null>(null);
  const [period, setPeriod] = useState('today');
  const [sanalganNaqd, setSanalganNaqd] = useState('');
  const [editPayment, setEditPayment] = useState<AviaPayment | null>(null);
  const [editRasxod, setEditRasxod] = useState<Rasxod | null>(null);
  const [movFilter, setMovFilter] = useState<'all' | 'prixod' | 'rasxod' | 'refund' | 'inkas'>('all');
  const [movSearch, setMovSearch] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);

  const { data: paymentsData, mutate: mutatePayments } = useSWR('/api/avia/payments', fetcher, { refreshInterval: 60000 });
  const { data: rasxodData, mutate: mutateRasxod } = useSWR('/api/avia/rasxod', fetcher, { refreshInterval: 60000 });
  const { data: refundData, mutate: mutateRefund } = useSWR('/api/avia/refund', fetcher, { refreshInterval: 60000 });
  const { data: inkData, mutate: mutateInk } = useSWR('/api/avia/inkassatsiya', fetcher, { refreshInterval: 60000 });
  const { data: reportsData, mutate: mutateReports } = useSWR(`/api/avia/reports${periodQuery(period)}`, fetcher, { refreshInterval: 60000 });

  // Hammasi (kassa kitobi/ostatok kümülatив hisob uchun) va davrga filtrlangani
  const allPayments = (paymentsData?.payments || []) as AviaPayment[];
  const allRasxod = (rasxodData?.rasxodlar || []) as Rasxod[];
  const allRefund = (refundData?.refundlar || []) as { id: string; sana: string; summa: number; mijozIsmi?: string; biletRaqam?: string }[];
  const allInk = (inkData?.inkassatsiya || []) as { id: string; sana: string; summa: number; turi?: string; airlineName?: string }[];
  const payments = allPayments.filter((p) => inPeriod(p.sana, period));
  const rasxodlar = allRasxod.filter((r) => inPeriod(r.sana, period));
  const refundlar = allRefund.filter((r) => inPeriod(r.sana, period));
  const inkPeriod = allInk.filter((i) => inPeriod(i.sana, period));

  const debts = reportsData?.debts || [];
  const settledCount = reportsData?.kpi?.settledCount ?? 0;

  const naqd = payments.filter((p: { tolovTuri: string }) => p.tolovTuri === 'naqd').reduce((s: number, p: { summa: number }) => s + p.summa, 0);
  const plastik = payments.filter((p: { tolovTuri: string }) => p.tolovTuri === 'plastik').reduce((s: number, p: { summa: number }) => s + p.summa, 0);
  const perechisleniya = payments.filter((p: { tolovTuri: string }) => p.tolovTuri === 'perechisleniya').reduce((s: number, p: { summa: number }) => s + p.summa, 0);
  const jamiPrixod = naqd + plastik + perechisleniya;
  const jamiRasxod = rasxodlar.reduce((s: number, r: { summa: number }) => s + r.summa, 0);
  const jamiRefund = refundlar.reduce((s: number, r: { summa: number }) => s + r.summa, 0);
  const jamiInk = inkPeriod.reduce((s: number, i: { summa: number }) => s + i.summa, 0);
  const jamiKassaTopshirish = inkPeriod.filter((i: { turi?: string }) => i.turi === 'kassa').reduce((s: number, i: { summa: number }) => s + i.summa, 0);
  const ostatok = jamiPrixod - jamiRasxod - jamiRefund - jamiInk;

  // Naqd sverka: kutilgan naqd = naqd kirim − rasxod − refund − kassa topshirish
  const kutilganNaqd = naqd - jamiRasxod - jamiRefund - jamiKassaTopshirish;
  const farq = sanalganNaqd === '' ? null : Number(sanalganNaqd) - kutilganNaqd;

  const refreshAll = () => { mutatePayments(); mutateRasxod(); mutateRefund(); mutateInk(); mutateReports(); };

  const activeTab = TABS.find((t) => t.key === tab)!;

  // ===== Birlashgan Kirim-Chiqim jurnali (hamma harakatlar bir joyda) =====
  type Mov = {
    id: string; kind: 'prixod' | 'rasxod' | 'refund' | 'inkas';
    sana: string; summa: number; label: string; sub?: string;
    payment?: AviaPayment; rasxod?: Rasxod;
  };
  const movements: Mov[] = [
    ...(payments as AviaPayment[]).map((p) => ({ id: p.id, kind: 'prixod' as const, sana: p.sana, summa: p.summa, label: p.mijozIsmi || p.biletRaqam || '—', sub: p.tolovTuri, payment: p })),
    ...(rasxodlar as Rasxod[]).map((r) => ({ id: r.id, kind: 'rasxod' as const, sana: r.sana, summa: r.summa, label: r.sabab || 'Rasxod', rasxod: r })),
    ...(refundlar as { id: string; sana: string; summa: number; mijozIsmi?: string; biletRaqam?: string }[]).map((r) => ({ id: r.id, kind: 'refund' as const, sana: r.sana, summa: r.summa, label: r.mijozIsmi || r.biletRaqam || 'Refund' })),
    ...(inkPeriod as { id: string; sana: string; summa: number; turi?: string; airlineName?: string }[]).map((i) => ({ id: i.id, kind: 'inkas' as const, sana: i.sana, summa: i.summa, label: i.turi === 'kassa' ? 'Kassa topshirish' : (i.airlineName || 'Inkassatsiya') })),
  ].sort((a, b) => ticketCreatedAtMs(b) - ticketCreatedAtMs(a));
  const movShown = movements.filter((m) => {
    if (movFilter !== 'all' && m.kind !== movFilter) return false;
    if (movSearch) {
      const q = movSearch.toLowerCase();
      if (!(`${m.label} ${m.sub || ''} ${m.sana}`).toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const MOV_META: Record<Mov['kind'], { label: string; color: string; sign: number }> = {
    prixod: { label: 'Prixod', color: '#2CA5E0', sign: 1 },
    rasxod: { label: 'Rasxod', color: '#FF5C5C', sign: -1 },
    refund: { label: 'Refund', color: '#F5A623', sign: -1 },
    inkas: { label: 'Inkas.', color: '#9B59B6', sign: -1 },
  };

  // ===== Kassa kitobi: kunlik ostatok (boshi/oxiri) — hamma harakatlardan kümülатив =====
  const dayMap = new Map<string, { kirim: number; chiqim: number }>();
  const bump = (sana: string, kirim: number, chiqim: number) => {
    const e = dayMap.get(sana) || { kirim: 0, chiqim: 0 };
    e.kirim += kirim; e.chiqim += chiqim; dayMap.set(sana, e);
  };
  allPayments.forEach((p) => bump(p.sana, p.summa, 0));
  allRasxod.forEach((r) => bump(r.sana, 0, r.summa));
  allRefund.forEach((r) => bump(r.sana, 0, r.summa));
  allInk.forEach((i) => bump(i.sana, 0, i.summa));
  const sortedDays = [...dayMap.keys()].sort();
  const kassaKitobi = sortedDays.map((sana, idx) => {
    // boshlang'ich ostatok = shu kungacha bo'lgan barcha kun (kirim − chiqim) yig'indisi
    const boshi = sortedDays.slice(0, idx).reduce((s, dd) => {
      const e = dayMap.get(dd)!;
      return s + e.kirim - e.chiqim;
    }, 0);
    const { kirim, chiqim } = dayMap.get(sana)!;
    return { sana, boshi, kirim, chiqim, oxiri: boshi + kirim - chiqim };
  });
  const kassaKitobiShown = kassaKitobi.filter((d) => inPeriod(d.sana, period)).reverse();

  const tableHeaderStyle: React.CSSProperties = {
    padding: '8px 12px', textAlign: 'left', color: '#4A5C50', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid #1E2E24',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Finansist</h1>
          <div style={{ color: '#4A5C50', fontSize: 12, marginTop: 4 }}>Davr: {periodLabel(period)}</div>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1E2E24', marginBottom: 24, position: 'relative' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'none',
            border: 'none', cursor: 'pointer', color: tab === t.key ? t.color : '#4A5C50',
            fontSize: 13, fontWeight: tab === t.key ? 700 : 500, transition: 'color 0.15s ease', position: 'relative',
          }}>
            <span>{t.icon}</span>
            {t.label}
            <div style={{
              position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: t.color,
              borderRadius: '2px 2px 0 0', opacity: tab === t.key ? 1 : 0,
              transform: tab === t.key ? 'scaleX(1)' : 'scaleX(0)', transition: 'opacity 0.2s ease, transform 0.2s ease',
            }} />
          </button>
        ))}
      </div>

      <div className="split-2">
        {/* Left: active form */}
        <div style={{
          backgroundColor: '#141F19', border: '1px solid #1E2E24',
          borderTop: `2px solid ${activeTab.color}50`, borderRadius: 14, padding: 24,
        }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: activeTab.color }}>{activeTab.icon}</span>
            {tab === 'prixod' ? 'Yangi Prixod / Obmen'
              : tab === 'rasxod' ? 'Rasxod (Chiqim)'
              : tab === 'refund' ? 'Refund (Pul qaytarish)'
              : 'Inkassatsiya (aviakompaniyaga)'}
          </h3>
          {tab === 'prixod' && <PaymentForm onSuccess={refreshAll} />}
          {tab === 'rasxod' && <RasxodForm onSuccess={refreshAll} />}
          {tab === 'refund' && <RefundForm onSuccess={refreshAll} />}
          {tab === 'inkassatsiya' && <InkassatsiyaTab onSuccess={refreshAll} />}
        </div>

        {/* Right: balance + monitoring */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Kunlik balans (ostatok) */}
          <div style={{
            backgroundColor: '#141F19',
            border: `1px solid ${ostatok >= 0 ? '#7CFF4F30' : '#FF5C5C30'}`,
            borderRadius: 14, padding: '20px 24px',
            borderTop: `2px solid ${ostatok >= 0 ? '#7CFF4F' : '#FF5C5C'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ color: '#4A5C50', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}>KUNLIK BALANS (OSTATOK)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: ostatok >= 0 ? '#7CFF4F' : '#FF5C5C', fontSize: 12, fontWeight: 600 }}>
                {ostatok >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {ostatok >= 0 ? 'Musbat' : 'Manfiy'}
              </div>
            </div>
            <div style={{
              color: ostatok >= 0 ? '#7CFF4F' : '#FF5C5C', fontSize: 30, fontWeight: 800,
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 12,
            }}>
              {formatMoney(ostatok)} so&apos;m
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, flexWrap: 'wrap' }}>
              <span style={{ color: '#2CA5E0', fontWeight: 600 }}>+{formatMoney(jamiPrixod)}</span>
              <span style={{ color: '#4A5C50' }}>prixod</span>
              <span style={{ color: '#4A5C50' }}>−</span>
              <span style={{ color: '#FF5C5C', fontWeight: 600 }}>{formatMoney(jamiRasxod)}</span>
              <span style={{ color: '#4A5C50' }}>rasxod</span>
              <span style={{ color: '#4A5C50' }}>−</span>
              <span style={{ color: '#F5A623', fontWeight: 600 }}>{formatMoney(jamiRefund)}</span>
              <span style={{ color: '#4A5C50' }}>refund</span>
              <span style={{ color: '#4A5C50' }}>−</span>
              <span style={{ color: '#9B59B6', fontWeight: 600 }}>{formatMoney(jamiInk)}</span>
              <span style={{ color: '#4A5C50' }}>inkas.</span>
            </div>
          </div>

          {/* Payment method KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Naqd', value: naqd, color: '#7CFF4F', icon: <Banknote size={18} /> },
              { label: 'Plastik', value: plastik, color: '#2CA5E0', icon: <Smartphone size={18} /> },
              { label: 'Perechisl.', value: perechisleniya, color: '#9B59B6', icon: <Building2 size={18} /> },
            ].map((item) => (
              <div key={item.label} style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                <div style={{ color: item.color, marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
                <div style={{ color: '#4A5C50', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>{item.label.toUpperCase()}</div>
                <div style={{ color: item.color, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(item.value)}</div>
              </div>
            ))}
          </div>

          {/* Rasxod / Refund / Inkassatsiya (bugun) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #FF5C5C25', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ color: '#4A5C50', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em' }}>RASXOD</div>
              <div style={{ color: '#FF5C5C', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>−{formatMoney(jamiRasxod)}</div>
            </div>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #F5A62325', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ color: '#4A5C50', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em' }}>REFUND</div>
              <div style={{ color: '#F5A623', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>−{formatMoney(jamiRefund)}</div>
            </div>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #9B59B625', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ color: '#4A5C50', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em' }}>INKAS.</div>
              <div style={{ color: '#9B59B6', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>−{formatMoney(jamiInk)}</div>
            </div>
          </div>

          {/* Naqd sverka (qo'ldagi pul ↔ tizim) */}
          <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 18 }}>
            <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calculator size={16} style={{ color: '#2CA5E0' }} /> Naqd Sverka
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Sanalgan naqd (qo&apos;lda)</label>
                <input type="number" value={sanalganNaqd} onChange={(e) => setSanalganNaqd(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Kutilgan naqd (tizim)</label>
                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: '#8A9A8F' }}>{formatMoney(kutilganNaqd)}</div>
              </div>
            </div>
            {farq !== null && (
              <div style={{
                padding: '10px 14px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                backgroundColor: farq === 0 ? '#7CFF4F12' : '#FF5C5C12',
                border: `1px solid ${farq === 0 ? '#7CFF4F30' : '#FF5C5C30'}`,
                color: farq === 0 ? '#7CFF4F' : '#FF5C5C', display: 'flex', justifyContent: 'space-between',
              }}>
                <span>{farq === 0 ? '✓ To\'g\'ri keladi' : farq > 0 ? 'Ortiqcha' : 'Kam'}</span>
                <span>{farq > 0 ? '+' : ''}{formatMoney(farq)} so&apos;m</span>
              </div>
            )}
            <div style={{ color: '#4A5C50', fontSize: 11, marginTop: 10 }}>Kutilgan = Naqd − Rasxod − Refund − Kassa topshirish</div>
          </div>

          {/* Bajarildi — to'langan biletlar */}
          <div style={{ backgroundColor: '#141F19', border: '1px solid #7CFF4F25', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle2 size={20} style={{ color: '#7CFF4F', flexShrink: 0 }} />
            <div>
              <div style={{ color: '#4A5C50', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em' }}>TO&apos;LANGAN BILETLAR (qarz yopilgan)</div>
              <div style={{ color: '#7CFF4F', fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{settledCount} ta</div>
            </div>
          </div>

          {/* Bilet qarzlari */}
          <AviaDebtTable debts={debts} />

          {/* Kassa kitobi — kunlik ostatok (boshi/oxiri) sanalar bilan */}
          <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 14, padding: 20, overflow: 'hidden' }}>
            <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calculator size={16} style={{ color: '#7CFF4F' }} /> Kassa kitobi — kunlik ostatok
            </h3>
            {kassaKitobiShown.length === 0 ? (
              <div style={{ color: '#4A5C50', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>Ma&apos;lumot yo&apos;q</div>
            ) : (
              <div style={{ maxHeight: 340, overflowY: 'auto', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Sana</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Ostatok boshi</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Kirim</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Chiqim</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Ostatok oxiri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kassaKitobiShown.map((d) => (
                      <tr key={d.sana} style={{ borderBottom: '1px solid #1E2E24' }}>
                        <td style={{ padding: '8px 12px', color: '#fff', fontSize: 12.5, fontWeight: 600 }}>{d.sana}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#8A9A8F', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(d.boshi)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#2CA5E0', fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>+{formatMoney(d.kirim)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#FF5C5C', fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>−{formatMoney(d.chiqim)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: d.oxiri >= 0 ? '#7CFF4F' : '#FF5C5C', fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(d.oxiri)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Kirim-Chiqim — barcha harakatlar (prixod/rasxod/refund/inkassatsiya) */}
          <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 14, padding: 20, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>Kirim-Chiqim — {periodLabel(period)}</h3>
              <span style={{ color: '#4A5C50', fontSize: 11, fontWeight: 600 }}>{movShown.length} ta</span>
            </div>
            <input value={movSearch} onChange={(e) => setMovSearch(e.target.value)} placeholder="Qidirish: mijoz, bilet, izoh, sana…"
              style={{ ...inputStyle, marginBottom: 10 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {([
                { k: 'all' as const, l: 'Hammasi', c: '#8A9A8F' },
                { k: 'prixod' as const, l: 'Prixod', c: '#2CA5E0' },
                { k: 'rasxod' as const, l: 'Rasxod', c: '#FF5C5C' },
                { k: 'refund' as const, l: 'Refund', c: '#F5A623' },
                { k: 'inkas' as const, l: 'Inkas.', c: '#9B59B6' },
              ]).map((f) => {
                const on = movFilter === f.k;
                return (
                  <button key={f.k} onClick={() => setMovFilter(f.k)} style={{ padding: '5px 11px', borderRadius: 7, fontSize: 11, fontWeight: on ? 700 : 500, cursor: 'pointer', border: `1px solid ${on ? f.c : '#1E2E24'}`, backgroundColor: on ? f.c + '18' : 'transparent', color: on ? f.c : '#4A5C50' }}>{f.l}</button>
                );
              })}
            </div>
            {movShown.length === 0 ? (
              <div style={{ color: '#4A5C50', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>Harakat yo&apos;q</div>
            ) : (
              <div style={{ maxHeight: 420, overflowY: 'auto', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Sana</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Tur</th>
                      <th style={tableHeaderStyle}>Tavsif</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Summa</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movShown.map((m) => {
                      const meta = MOV_META[m.kind];
                      const remaining = ticketEditRemainingMs(m, now);
                      const canEdit = (m.kind === 'prixod' || m.kind === 'rasxod') && remaining > 0;
                      const soat = Math.floor(remaining / 3600000);
                      return (
                        <tr key={m.id}
                          onMouseEnter={() => setTableRowHover(m.id)}
                          onMouseLeave={() => setTableRowHover(null)}
                          style={{ borderBottom: '1px solid #1E2E24', backgroundColor: tableRowHover === m.id ? '#1E2E2450' : 'transparent', transition: 'background-color 0.1s ease' }}>
                          <td style={{ padding: '8px 12px', color: '#8A9A8F', fontSize: 12 }}>{m.sana}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, backgroundColor: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}30` }}>{meta.label}</span>
                          </td>
                          <td style={{ padding: '8px 12px', color: '#fff', fontSize: 12.5 }}>
                            {m.label}{m.sub ? <span style={{ color: '#4A5C50', fontSize: 11 }}> · {m.sub}</span> : null}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: meta.color }}>
                            {meta.sign > 0 ? '+' : '−'}{formatMoney(m.summa)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {(m.kind === 'prixod' || m.kind === 'rasxod') ? (
                              canEdit ? (
                                <button onClick={() => (m.kind === 'prixod' ? setEditPayment(m.payment!) : setEditRasxod(m.rasxod!))}
                                  title={`${soat} soat ichida tahrirlash mumkin`}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', backgroundColor: '#F5A62318', color: '#F5A623', border: '1px solid #F5A62340' }}>
                                  <Pencil size={10} /> {soat}s
                                </button>
                              ) : (
                                <span title="48 soatlik muddat tugagan" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#4A5C50', fontSize: 11 }}><Lock size={10} /></span>
                              )
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
        </div>
      </div>

      {editPayment && (
        <PaymentEditModal payment={editPayment} onClose={() => setEditPayment(null)} onSaved={refreshAll} />
      )}
      {editRasxod && (
        <RasxodEditModal rasxod={editRasxod} onClose={() => setEditRasxod(null)} onSaved={refreshAll} />
      )}
    </div>
  );
}
