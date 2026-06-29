'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Banknote, Smartphone, Building2, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import type { PaymentType, Valyuta } from '@/types/avia';
import AviaDebtTable from '@/components/avia/AviaDebtTable';
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

export default function FinansistPage() {
  const [tableRowHover, setTableRowHover] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const { data: paymentsData, mutate: mutatePayments } = useSWR(
    `/api/avia/payments?from=${today}&to=${today}`,
    fetcher,
    { refreshInterval: 60000 }
  );
  // Barcha qarzlar va to'langan biletlar uchun (sana bo'yicha filtrlanmagan)
  const { data: reportsData, mutate: mutateReports } = useSWR('/api/avia/reports', fetcher, { refreshInterval: 60000 });

  const payments = paymentsData?.payments || [];
  const debts = reportsData?.debts || [];
  const settledCount = reportsData?.kpi?.settledCount ?? 0;

  const naqd = payments.filter((p: { tolovTuri: string }) => p.tolovTuri === 'naqd').reduce((s: number, p: { summa: number }) => s + p.summa, 0);
  const plastik = payments.filter((p: { tolovTuri: string }) => p.tolovTuri === 'plastik').reduce((s: number, p: { summa: number }) => s + p.summa, 0);
  const perechisleniya = payments.filter((p: { tolovTuri: string }) => p.tolovTuri === 'perechisleniya').reduce((s: number, p: { summa: number }) => s + p.summa, 0);
  const jamiPrixod = naqd + plastik + perechisleniya;

  const refreshAll = () => { mutatePayments(); mutateReports(); };

  const tableHeaderStyle: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    color: '#4A5C50',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    borderBottom: '1px solid #1E2E24',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
          Finansist
        </h1>
        <div style={{ color: '#4A5C50', fontSize: 12 }}>
          {new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Prixod form (Obmen shu yerda — UZS/USD) */}
        <div
          style={{
            backgroundColor: '#141F19',
            border: '1px solid #1E2E24',
            borderTop: `2px solid ${ACCENT}50`,
            borderRadius: 14,
            padding: 24,
          }}
        >
          <h3 style={{
            color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: ACCENT }}><ArrowUpRight size={16} /></span>
            Yangi Prixod / Obmen
          </h3>
          <PaymentForm onSuccess={refreshAll} />
        </div>

        {/* Right: Monitoring */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Prixod (bugun) banner */}
          <div style={{
            backgroundColor: '#141F19',
            border: `1px solid ${ACCENT}30`,
            borderRadius: 14,
            padding: '20px 24px',
            borderTop: `2px solid ${ACCENT}`,
          }}>
            <div style={{ color: '#4A5C50', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
              PRIXOD (BUGUN)
            </div>
            <div style={{
              color: ACCENT,
              fontSize: 30,
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
            }}>
              {formatMoney(jamiPrixod)} so&apos;m
            </div>
          </div>

          {/* Payment Method KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Naqd', value: naqd, color: '#7CFF4F', icon: <Banknote size={18} /> },
              { label: 'Plastik', value: plastik, color: '#2CA5E0', icon: <Smartphone size={18} /> },
              { label: 'Perechisl.', value: perechisleniya, color: '#9B59B6', icon: <Building2 size={18} /> },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  backgroundColor: '#141F19',
                  border: '1px solid #1E2E24',
                  borderRadius: 12,
                  padding: '14px 12px',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: item.color, marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                  {item.icon}
                </div>
                <div style={{ color: '#4A5C50', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>
                  {item.label.toUpperCase()}
                </div>
                <div style={{ color: item.color, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(item.value)}
                </div>
              </div>
            ))}
          </div>

          {/* Bajarildi — to'langan biletlar */}
          <div style={{
            backgroundColor: '#141F19',
            border: '1px solid #7CFF4F25',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <CheckCircle2 size={20} style={{ color: '#7CFF4F', flexShrink: 0 }} />
            <div>
              <div style={{ color: '#4A5C50', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em' }}>
                TO&apos;LANGAN BILETLAR (qarz yopilgan)
              </div>
              <div style={{ color: '#7CFF4F', fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {settledCount} ta
              </div>
            </div>
          </div>

          {/* Bilet qarzlari (долги по билетам) */}
          <AviaDebtTable debts={debts} />

          {/* Today's Payments Table */}
          <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 14, padding: 20, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>Bugungi Prixodlar</h3>
              {payments.length > 0 && (
                <span style={{ color: '#4A5C50', fontSize: 11, fontWeight: 600 }}>
                  {payments.length} ta
                </span>
              )}
            </div>
            {payments.length === 0 ? (
              <div style={{ color: '#4A5C50', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>
                Bugun prixod yo&apos;q
              </div>
            ) : (
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      const badgeColor =
                        p.tolovTuri === 'naqd' ? '#7CFF4F' :
                        p.tolovTuri === 'plastik' ? '#2CA5E0' : '#9B59B6';
                      return (
                        <tr
                          key={p.id}
                          onMouseEnter={() => setTableRowHover(p.id)}
                          onMouseLeave={() => setTableRowHover(null)}
                          style={{
                            borderBottom: '1px solid #1E2E24',
                            backgroundColor: tableRowHover === p.id ? '#1E2E2450' : 'transparent',
                            transition: 'background-color 0.1s ease',
                          }}
                        >
                          <td style={{ padding: '9px 12px', color: '#8A9A8F', fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>
                            {p.biletRaqam || '—'}
                          </td>
                          <td style={{ padding: '9px 12px', color: '#fff', fontSize: 13 }}>{p.mijozIsmi}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                              letterSpacing: '0.05em', textTransform: 'uppercase',
                              backgroundColor: badgeColor + '18',
                              color: badgeColor,
                              border: `1px solid ${badgeColor}30`,
                            }}>
                              {p.tolovTuri}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', color: '#7CFF4F', fontSize: 13, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(p.summa)}
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
    </div>
  );
}
