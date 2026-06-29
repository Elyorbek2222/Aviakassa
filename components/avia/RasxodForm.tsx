'use client';

import { useState } from 'react';
import { inputStyle, labelStyle, MessageBox } from './formStyles';

export default function RasxodForm({ onSuccess }: { onSuccess: () => void }) {
  const [summa, setSumma] = useState('');
  const [sabab, setSabab] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/avia/rasxod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summa: Number(summa), sabab }),
      });
      if (res.ok) { setMessage('Rasxod saqlandi!'); setSumma(''); setSabab(''); onSuccess(); }
      else setMessage('Xatolik');
    } catch { setMessage('Xatolik'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Summa (UZS)</label>
        <input type="number" value={summa} onChange={e => setSumma(e.target.value)} placeholder="0" required style={inputStyle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Sabab</label>
        <input type="text" value={sabab} onChange={e => setSabab(e.target.value)} placeholder="Nima uchun chiqim?" required style={inputStyle} />
      </div>
      <MessageBox message={message} />
      <button type="submit" disabled={loading} style={{
        width: '100%', padding: '12px 20px', borderRadius: 9, border: '1px solid #FF5C5C',
        backgroundColor: '#FF5C5C18', color: '#FF5C5C', fontSize: 14, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, letterSpacing: '0.04em',
      }}>
        {loading ? 'Saqlanmoqda...' : '− Rasxod Yozish'}
      </button>
    </form>
  );
}
