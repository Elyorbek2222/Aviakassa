'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Landmark } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { AIRLINE_LABELS, type AirlineKey } from '@/types/avia';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function InkassatsiyaForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    airline: 'uzairways' as AirlineKey,
    summa: '',
    izoh: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/avia/inkassatsiya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          airlineName: AIRLINE_LABELS[form.airline] || form.airline,
          summa: Number(form.summa),
        }),
      });

      if (res.ok) {
        setMessage('Inkassatsiya saqlandi!');
        setForm({ airline: 'uzairways', summa: '', izoh: '' });
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
    <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 24 }}>
      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Landmark size={20} style={{ color: '#9B59B6' }} />
        Yangi Inkassatsiya
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Aviakompaniya</label>
          <select value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value as AirlineKey })} style={inputStyle}>
            {Object.entries(AIRLINE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
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
          backgroundColor: '#9B59B6', color: '#fff', fontSize: 15, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
        }}>
          {loading ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </form>
    </div>
  );
}

export default function BuxgalterPage() {
  const { data: reportsData, mutate: mutateReports, isLoading: reportsLoading, error: reportsError } = useSWR('/api/avia/reports', fetcher, { refreshInterval: 60000 });
  const { data: inkData, mutate: mutateInk, isLoading: inkLoading } = useSWR('/api/avia/inkassatsiya', fetcher, { refreshInterval: 60000 });

  const partnerDebts = reportsData?.partnerDebts || [];
  const inkassatsiya = inkData?.inkassatsiya || [];

  const handleSuccess = () => {
    mutateReports();
    mutateInk();
  };

  if (reportsLoading || inkLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 40, color: '#4A5C50' }}>
        <div style={{ width: 18, height: 18, border: '2px solid #1E2E24', borderTopColor: '#9B59B6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        Yuklanmoqda...
      </div>
    );
  }
  if (reportsError) {
    return <div style={{ color: '#FF3B30', padding: 40 }}>Ma&apos;lumotlarni yuklashda xatolik</div>;
  }

  return (
    <div>
      <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 24, letterSpacing: '-0.5px' }}>
        Inkassatsiya
      </h1>

      <div className="split-2">
        {/* Left: Form */}
        <InkassatsiyaForm onSuccess={handleSuccess} />

        {/* Right: Partner Debts + History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Partner Debts */}
          <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 20 }}>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              Partnyorlar Holati
            </h3>
            {partnerDebts.length === 0 ? (
              <div style={{ color: '#4A5C50', textAlign: 'center', padding: 20, fontSize: 14 }}>
                Ma&apos;lumot yo&apos;q
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Airline</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Tarif</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Inkassatsiya</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Qarz</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerDebts.map((d: { airline: string; biletlarSumma: number; inkassatsiya: number; qarz: number }) => (
                    <tr key={d.airline} style={{ borderBottom: '1px solid #1E2E24' }}>
                      <td style={{ padding: '8px 10px', color: '#fff', fontSize: 13 }}>{d.airline}</td>
                      <td style={{ padding: '8px 10px', color: '#fff', fontSize: 13, textAlign: 'right' }}>{formatMoney(d.biletlarSumma)}</td>
                      <td style={{ padding: '8px 10px', color: '#7CFF4F', fontSize: 13, textAlign: 'right' }}>{formatMoney(d.inkassatsiya)}</td>
                      <td style={{ padding: '8px 10px', color: d.qarz > 0 ? '#FF3B30' : '#7CFF4F', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{formatMoney(d.qarz)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Inkassatsiya History */}
          <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 20 }}>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              Inkassatsiya Tarixi
            </h3>
            {inkassatsiya.length === 0 ? (
              <div style={{ color: '#4A5C50', textAlign: 'center', padding: 20, fontSize: 14 }}>
                Hozircha inkassatsiya yo&apos;q
              </div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Sana</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Airline</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Summa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inkassatsiya.slice().reverse().slice(0, 15).map((i: { id: string; sana: string; airlineName: string; summa: number }) => (
                      <tr key={i.id} style={{ borderBottom: '1px solid #1E2E24' }}>
                        <td style={{ padding: '8px 10px', color: '#8A9A8F', fontSize: 13 }}>{i.sana}</td>
                        <td style={{ padding: '8px 10px', color: '#fff', fontSize: 13 }}>{i.airlineName}</td>
                        <td style={{ padding: '8px 10px', color: '#9B59B6', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{formatMoney(i.summa)}</td>
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
