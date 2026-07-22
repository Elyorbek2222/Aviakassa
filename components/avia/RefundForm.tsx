'use client';

import { useState } from 'react';
import { AIRLINE_LABELS, type AirlineKey } from '@/types/avia';
import { inputStyle, labelStyle, MessageBox } from './formStyles';

export default function RefundForm({ onSuccess, manbaSuggestions = [] }: { onSuccess: () => void; manbaSuggestions?: string[] }) {
  const [biletRaqam, setBiletRaqam] = useState('');
  const [mijozIsmi, setMijozIsmi] = useState('');
  const [airline, setAirline] = useState<AirlineKey>('uzairways');
  const [manba, setManba] = useState('');
  const [summa, setSumma] = useState('');
  const [izoh, setIzoh] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/avia/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          biletRaqam, mijozIsmi,
          airline, airlineName: AIRLINE_LABELS[airline] || airline,
          manba: manba || undefined,
          summa: Number(summa), izoh,
        }),
      });
      if (res.ok) {
        setMessage('Refund saqlandi!');
        setBiletRaqam(''); setMijozIsmi(''); setManba(''); setSumma(''); setIzoh('');
        onSuccess();
      } else setMessage('Xatolik');
    } catch { setMessage('Xatolik'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Bilet Raqami</label>
        <input type="text" value={biletRaqam} onChange={e => setBiletRaqam(e.target.value)} placeholder="001-1234567890" required style={inputStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Mijoz Ismi</label>
        <input type="text" value={mijozIsmi} onChange={e => setMijozIsmi(e.target.value)} placeholder="Familiya Ism" required style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Aviakompaniya</label>
          <select value={airline} onChange={e => setAirline(e.target.value as AirlineKey)} style={inputStyle}>
            {Object.entries(AIRLINE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Qaysi joydan (manba)</label>
          <input type="text" list="refund-manba-list" value={manba} onChange={e => setManba(e.target.value)} placeholder="Centrum, to'g'ridan, agent…" style={inputStyle} />
          <datalist id="refund-manba-list">
            {manbaSuggestions.map((m) => <option key={m} value={m} />)}
          </datalist>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Qaytariladigan Summa (UZS)</label>
        <input type="number" value={summa} onChange={e => setSumma(e.target.value)} placeholder="0" required style={inputStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Izoh</label>
        <input type="text" value={izoh} onChange={e => setIzoh(e.target.value)} placeholder="Sabab" style={inputStyle} />
      </div>
      <MessageBox message={message} />
      <button type="submit" disabled={loading} style={{
        width: '100%', padding: '12px 20px', borderRadius: 9, border: '1px solid #F5A623',
        backgroundColor: '#F5A62318', color: '#F5A623', fontSize: 14, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, letterSpacing: '0.04em',
      }}>
        {loading ? 'Saqlanmoqda...' : '↩ Refund Yozish'}
      </button>
    </form>
  );
}
