'use client';

import { useState, FormEvent } from 'react';
import { AIRLINE_LABELS, type AirlineKey } from '@/types/avia';

interface Props {
  onSuccess?: () => void;
}

export default function InkassatsiyaForm({ onSuccess }: Props) {
  const [airline, setAirline] = useState<AirlineKey>('uzairways');
  const [summa, setSumma] = useState<number | ''>('');
  const [izoh, setIzoh] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/avia/inkassatsiya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airline,
          summa: Number(summa),
          izoh: izoh || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Xatolik yuz berdi');
      }

      setSumma('');
      setIzoh('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #1E2E24',
    backgroundColor: '#0A0F0D',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#8A9A8F',
    fontSize: 13,
    marginBottom: 6,
    fontWeight: 500,
  };

  return (
    <div
      style={{
        backgroundColor: '#141F19',
        border: '1px solid #1E2E24',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
        Inkassatsiya qilish
      </h3>

      {error && (
        <div style={{ color: '#FF4444', fontSize: 13, marginBottom: 12, padding: '8px 12px', backgroundColor: '#FF444420', borderRadius: 8 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Airline */}
        <div>
          <label style={labelStyle}>Partnyorni tanlash</label>
          <select
            value={airline}
            onChange={(e) => setAirline(e.target.value as AirlineKey)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {(Object.entries(AIRLINE_LABELS) as [AirlineKey, string][]).map(([key, name]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
        </div>

        {/* Summa */}
        <div>
          <label style={labelStyle}>Summa UZS</label>
          <input
            type="number"
            value={summa}
            onChange={(e) => setSumma(e.target.value ? Number(e.target.value) : '')}
            placeholder="0"
            required
            style={inputStyle}
          />
        </div>

        {/* Izoh */}
        <div>
          <label style={labelStyle}>Izoh</label>
          <input
            type="text"
            value={izoh}
            onChange={(e) => setIzoh(e.target.value)}
            placeholder="Ixtiyoriy izoh..."
            style={inputStyle}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 20px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#9B59B6',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Yuklanmoqda...' : 'Inkassatsiya qilish'}
        </button>
      </form>
    </div>
  );
}
