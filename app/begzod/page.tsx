'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plane, FileText } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { AIRLINE_LABELS, type AirlineKey } from '@/types/avia';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function TicketForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    airline: 'ozhyo' as AirlineKey,
    biletRaqam: '',
    yolovchi: '',
    passengerCount: 1,
    tarif: '',
    sotishNarxi: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/avia/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          airlineName: AIRLINE_LABELS[form.airline] || form.airline,
          tarif: Number(form.tarif),
          sotishNarxi: Number(form.sotishNarxi),
        }),
      });

      if (res.ok) {
        setMessage('Bilet saqlandi!');
        setForm({ airline: 'ozhyo', biletRaqam: '', yolovchi: '', passengerCount: 1, tarif: '', sotishNarxi: '' });
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
        <FileText size={20} style={{ color: '#7CFF4F' }} />
        Yangi Bilet
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Aviakompaniya</label>
          <select
            value={form.airline}
            onChange={(e) => setForm({ ...form, airline: e.target.value as AirlineKey })}
            style={inputStyle}
          >
            {Object.entries(AIRLINE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Bilet Raqami</label>
          <input
            type="text"
            value={form.biletRaqam}
            onChange={(e) => setForm({ ...form, biletRaqam: e.target.value })}
            placeholder="001-1234567890"
            required
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Yo&apos;lovchi Ismi</label>
          <input
            type="text"
            value={form.yolovchi}
            onChange={(e) => setForm({ ...form, yolovchi: e.target.value })}
            placeholder="Familiya Ism"
            required
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Tarif (UZS)</label>
            <input
              type="number"
              value={form.tarif}
              onChange={(e) => setForm({ ...form, tarif: e.target.value })}
              placeholder="0"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Sotish Narxi (UZS)</label>
            <input
              type="number"
              value={form.sotishNarxi}
              onChange={(e) => setForm({ ...form, sotishNarxi: e.target.value })}
              placeholder="0"
              required
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Yo&apos;lovchilar soni</label>
          <input
            type="number"
            value={form.passengerCount}
            onChange={(e) => setForm({ ...form, passengerCount: Number(e.target.value) })}
            min={1}
            style={inputStyle}
          />
        </div>

        {message && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              backgroundColor: message.includes('saqlandi') ? 'rgba(124,255,79,0.1)' : 'rgba(255,59,48,0.1)',
              color: message.includes('saqlandi') ? '#7CFF4F' : '#FF3B30',
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#7CFF4F',
            color: '#0A0F0D',
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </form>
    </div>
  );
}

export default function BegzodPage() {
  const { data: ticketsData, mutate: mutateTickets } = useSWR(
    '/api/avia/tickets?agent=Kassir-Agent',
    fetcher,
    { refreshInterval: 15000 }
  );
  const { data: reportsData } = useSWR('/api/avia/reports', fetcher, { refreshInterval: 30000 });

  const tickets = ticketsData?.tickets || [];
  const today = new Date().toISOString().split('T')[0];
  const bugunBiletlar = tickets.filter((t: { sana: string }) => t.sana === today).length;
  const jamiSotuv = tickets.reduce((s: number, t: { sotishNarxi: number }) => s + t.sotishNarxi, 0);
  const debts = reportsData?.debts || [];

  return (
    <div>
      <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        Bilet Yozish
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Form */}
        <TicketForm onSuccess={() => mutateTickets()} />

        {/* Right: KPI + Table + Debts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mini KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div
              style={{
                backgroundColor: '#141F19',
                border: '1px solid #1E2E24',
                borderRadius: 12,
                padding: 16,
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#8A9A8F', fontSize: 12 }}>Bugun Biletlar</div>
              <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{bugunBiletlar}</div>
            </div>
            <div
              style={{
                backgroundColor: '#141F19',
                border: '1px solid #1E2E24',
                borderRadius: 12,
                padding: 16,
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#8A9A8F', fontSize: 12 }}>Jami Sotuv</div>
              <div style={{ color: '#7CFF4F', fontSize: 24, fontWeight: 700 }}>{formatMoney(jamiSotuv)}</div>
            </div>
          </div>

          {/* My Tickets Table */}
          <div
            style={{
              backgroundColor: '#141F19',
              border: '1px solid #1E2E24',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plane size={18} style={{ color: '#F5A623' }} />
              O&apos;z Biletlarim
            </h3>
            {tickets.length === 0 ? (
              <div style={{ color: '#4A5C50', textAlign: 'center', padding: 20, fontSize: 14 }}>
                Hozircha bilet yo&apos;q
              </div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Sana</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Bilet</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Yo&apos;lovchi</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Narx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.slice(-10).reverse().map((t: { id: string; sana: string; biletRaqam: string; yolovchi: string; sotishNarxi: number }) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #1E2E24' }}>
                        <td style={{ padding: '8px 10px', color: '#8A9A8F', fontSize: 13 }}>{t.sana}</td>
                        <td style={{ padding: '8px 10px', color: '#fff', fontSize: 13 }}>{t.biletRaqam}</td>
                        <td style={{ padding: '8px 10px', color: '#fff', fontSize: 13 }}>{t.yolovchi}</td>
                        <td style={{ padding: '8px 10px', color: '#7CFF4F', fontSize: 13, textAlign: 'right' }}>{formatMoney(t.sotishNarxi)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Debt Section */}
          {debts.length > 0 && (
            <div
              style={{
                backgroundColor: '#141F19',
                border: '1px solid #1E2E24',
                borderRadius: 12,
                padding: 20,
              }}
            >
              <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                Qarz Holati
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Mijoz</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>Qarz</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.slice(0, 10).map((d: { biletId: string; mijozIsmi: string; qarz: number }) => (
                    <tr key={d.biletId} style={{ borderBottom: '1px solid #1E2E24' }}>
                      <td style={{ padding: '8px 10px', color: '#fff', fontSize: 13 }}>{d.mijozIsmi}</td>
                      <td style={{ padding: '8px 10px', color: '#FF3B30', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{formatMoney(d.qarz)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
