'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Banknote, Smartphone, Building2, ArrowUpRight, ArrowDownRight,
  TrendingDown, TrendingUp, CheckCircle2, Landmark, Calculator,
} from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { AIRLINE_LABELS, type PaymentType, type Valyuta, type AirlineKey } from '@/types/avia';
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

  const { data: paymentsData, mutate: mutatePayments } = useSWR(`/api/avia/payments${periodQuery(period)}`, fetcher, { refreshInterval: 60000 });
  const { data: rasxodData, mutate: mutateRasxod } = useSWR('/api/avia/rasxod', fetcher, { refreshInterval: 60000 });
  const { data: refundData, mutate: mutateRefund } = useSWR('/api/avia/refund', fetcher, { refreshInterval: 60000 });
  const { data: inkData, mutate: mutateInk } = useSWR('/api/avia/inkassatsiya', fetcher, { refreshInterval: 60000 });
  const { data: reportsData, mutate: mutateReports } = useSWR(`/api/avia/reports${periodQuery(period)}`, fetcher, { refreshInterval: 60000 });

  const payments = paymentsData?.payments || [];
  const rasxodlar = (rasxodData?.rasxodlar || []).filter((r: { sana: string }) => inPeriod(r.sana, period));
  const refundlar = (refundData?.refundlar || []).filter((r: { sana: string }) => inPeriod(r.sana, period));
  const inkPeriod = (inkData?.inkassatsiya || []).filter((i: { sana: string }) => inPeriod(i.sana, period));

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

          {/* Bugungi prixodlar */}
          <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 14, padding: 20, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>{period === 'today' ? 'Bugungi Prixodlar' : `Prixodlar — ${periodLabel(period)}`}</h3>
              {payments.length > 0 && <span style={{ color: '#4A5C50', fontSize: 11, fontWeight: 600 }}>{payments.length} ta</span>}
            </div>
            {payments.length === 0 ? (
              <div style={{ color: '#4A5C50', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>Bugun prixod yo&apos;q</div>
            ) : (
              <div style={{ maxHeight: 360, overflowY: 'auto', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Bilet</th>
                      <th style={tableHeaderStyle}>Mijoz</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Turi</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Summa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: { id: string; biletRaqam: string; mijozIsmi: string; tolovTuri: string; summa: number }) => {
                      const badgeColor = p.tolovTuri === 'naqd' ? '#7CFF4F' : p.tolovTuri === 'plastik' ? '#2CA5E0' : '#9B59B6';
                      return (
                        <tr key={p.id}
                          onMouseEnter={() => setTableRowHover(p.id)}
                          onMouseLeave={() => setTableRowHover(null)}
                          style={{ borderBottom: '1px solid #1E2E24', backgroundColor: tableRowHover === p.id ? '#1E2E2450' : 'transparent', transition: 'background-color 0.1s ease' }}>
                          <td style={{ padding: '9px 12px', color: '#8A9A8F', fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>{p.biletRaqam || '—'}</td>
                          <td style={{ padding: '9px 12px', color: '#fff', fontSize: 13 }}>{p.mijozIsmi}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', backgroundColor: badgeColor + '18', color: badgeColor, border: `1px solid ${badgeColor}30` }}>{p.tolovTuri}</span>
                          </td>
                          <td style={{ padding: '9px 12px', color: '#7CFF4F', fontSize: 13, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(p.summa)}</td>
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
    </div>
  );
}
