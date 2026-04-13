'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { CreditCard, Banknote, Smartphone, Building2 } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import type { PaymentType, Valyuta } from '@/types/avia';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
          summAsl: form.valyuta === 'usd' ? Number(form.summAsl) : undefined,
          kurs: form.valyuta === 'usd' ? Number(form.kurs) : undefined,
          summa: Number(form.summa),
        }),
      });

      if (res.ok) {
        setMessage('To\'lov saqlandi!');
        setForm({ biletRaqam: '', mijozIsmi: '', valyuta: 'uzs', summAsl: '', kurs: '', summa: '', tolovTuri: 'naqd', izoh: '' });
        onSuccess();
      } else {
        setMessage('Xatolik yuz berdi');
      }
    } catch {
      setMessage('Serverga ulanib bo\'lmadi');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #1E2E24',
    backgroundColor: '#0A0F0D',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = { display: 'block', color: '#8A9A8F', fontSize: 13, marginBottom: 6 };

  return (
    <div
      style={{
        backgroundColor: '#141F19',
        border: '1px solid #1E2E24',
        borderRadius: 12,
        padding: 24,
      }}
    >
      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <CreditCard size={20} style={{ color: '#2CA5E0' }} />
        Yangi Prixod
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Bilet Raqami</label>
          <input type="text" value={form.biletRaqam} onChange={(e) => setForm({ ...form, biletRaqam: e.target.value })} placeholder="001-1234567890" required style={inputStyle} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Mijoz Ismi</label>
          <input type="text" value={form.mijozIsmi} onChange={(e) => setForm({ ...form, mijozIsmi: e.target.value })} placeholder="Familiya Ism" required style={inputStyle} />
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
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Izoh</label>
          <input type="text" value={form.izoh} onChange={(e) => setForm({ ...form, izoh: e.target.value })} placeholder="Qo'shimcha ma'lumot" style={inputStyle} />
        </div>

        {message && (
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            backgroundColor: message.includes('saqlandi') ? 'rgba(124,255,79,0.1)' : 'rgba(255,59,48,0.1)',
            color: message.includes('saqlandi') ? '#7CFF4F' : '#FF3B30',
            fontSize: 13, marginBottom: 14,
          }}>
            {message}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: 12, borderRadius: 8, border: 'none',
          backgroundColor: '#2CA5E0', color: '#fff', fontSize: 15, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
        }}>
          {loading ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </form>
    </div>
  );
}

export default function KassirPage() {
  const today = new Date().toISOString().split('T')[0];
  const { data: paymentsData, mutate: mutatePayments } = useSWR(
    `/api/avia/payments?from=${today}&to=${today}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const payments = paymentsData?.payments || [];
  const naqd = payments.filter((p: { tolovTuri: string }) => p.tolovTuri === 'naqd').reduce((s: number, p: { summa: number }) => s + p.summa, 0);
  const plastik = payments.filter((p: { tolovTuri: string }) => p.tolovTuri === 'plastik').reduce((s: number, p: { summa: number }) => s + p.summa, 0);
  const perechisleniya = payments.filter((p: { tolovTuri: string }) => p.tolovTuri === 'perechisleniya').reduce((s: number, p: { summa: number }) => s + p.summa, 0);
  const jamiStok = naqd + plastik + perechisleniya;

  return (
    <div>
      <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        Prixod Kirgizish
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Form */}
        <PaymentForm onSuccess={() => mutatePayments()} />

        {/* Right: KPI + Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Stok KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <Banknote size={20} style={{ color: '#7CFF4F', margin: '0 auto 8px' }} />
              <div style={{ color: '#8A9A8F', fontSize: 12 }}>Naqd</div>
              <div style={{ color: '#7CFF4F', fontSize: 20, fontWeight: 700 }}>{formatMoney(naqd)}</div>
            </div>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <Smartphone size={20} style={{ color: '#2CA5E0', margin: '0 auto 8px' }} />
              <div style={{ color: '#8A9A8F', fontSize: 12 }}>Plastik</div>
              <div style={{ color: '#2CA5E0', fontSize: 20, fontWeight: 700 }}>{formatMoney(plastik)}</div>
            </div>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <Building2 size={20} style={{ color: '#9B59B6', margin: '0 auto 8px' }} />
              <div style={{ color: '#8A9A8F', fontSize: 12 }}>Perechisleniya</div>
              <div style={{ color: '#9B59B6', fontSize: 20, fontWeight: 700 }}>{formatMoney(perechisleniya)}</div>
            </div>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <CreditCard size={20} style={{ color: '#F5A623', margin: '0 auto 8px' }} />
              <div style={{ color: '#8A9A8F', fontSize: 12 }}>Jami Stok</div>
              <div style={{ color: '#F5A623', fontSize: 20, fontWeight: 700 }}>{formatMoney(jamiStok)}</div>
            </div>
          </div>

          {/* Today's Payments Table */}
          <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 20 }}>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              Bugungi Prixodlar
            </h3>
            {payments.length === 0 ? (
              <div style={{ color: '#4A5C50', textAlign: 'center', padding: 20, fontSize: 14 }}>
                Bugun prixod yo&apos;q
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Bilet</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Mijoz</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Turi</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Summa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: { id: string; biletRaqam: string; mijozIsmi: string; tolovTuri: string; summa: number }) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #1E2E24' }}>
                        <td style={{ padding: '8px 10px', color: '#fff', fontSize: 13 }}>{p.biletRaqam}</td>
                        <td style={{ padding: '8px 10px', color: '#fff', fontSize: 13 }}>{p.mijozIsmi}</td>
                        <td style={{ padding: '8px 10px', fontSize: 13 }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                            backgroundColor: p.tolovTuri === 'naqd' ? 'rgba(124,255,79,0.15)' : p.tolovTuri === 'plastik' ? 'rgba(44,165,224,0.15)' : 'rgba(155,89,182,0.15)',
                            color: p.tolovTuri === 'naqd' ? '#7CFF4F' : p.tolovTuri === 'plastik' ? '#2CA5E0' : '#9B59B6',
                          }}>
                            {p.tolovTuri}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', color: '#7CFF4F', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{formatMoney(p.summa)}</td>
                      </tr>
                    ))}
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
