'use client';

import { useState, FormEvent } from 'react';
import { AIRLINE_LABELS, type AirlineKey } from '@/types/avia';

interface Props {
  onSuccess?: () => void;
}

export default function TicketForm({ onSuccess }: Props) {
  const [airline, setAirline] = useState<AirlineKey>('ozhyo');
  const [biletRaqam, setBiletRaqam] = useState('');
  const [yolovchi, setYolovchi] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [tarif, setTarif] = useState<number | ''>('');
  const [sotishNarxi, setSotishNarxi] = useState<number | ''>('');
  const [izoh, setIzoh] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const foyda = typeof tarif === 'number' && typeof sotishNarxi === 'number'
    ? sotishNarxi - tarif
    : 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/avia/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airline,
          biletRaqam,
          yolovchi,
          passengerCount,
          tarif: Number(tarif),
          sotishNarxi: Number(sotishNarxi),
          izoh: izoh || undefined,
          agent: '',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Xatolik yuz berdi');
      }

      setBiletRaqam('');
      setYolovchi('');
      setPassengerCount(1);
      setTarif('');
      setSotishNarxi('');
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
        Bilet yozish
      </h3>

      {error && (
        <div style={{ color: '#FF4444', fontSize: 13, marginBottom: 12, padding: '8px 12px', backgroundColor: '#FF444420', borderRadius: 8 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Airline */}
        <div>
          <label style={labelStyle}>Aviakompaniya</label>
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

        {/* Bilet raqam */}
        <div>
          <label style={labelStyle}>Bilet raqami</label>
          <input
            type="text"
            value={biletRaqam}
            onChange={(e) => setBiletRaqam(e.target.value)}
            placeholder="555-1234567890"
            required
            style={inputStyle}
          />
        </div>

        {/* Yo'lovchi */}
        <div>
          <label style={labelStyle}>Yo&apos;lovchi ismi</label>
          <input
            type="text"
            value={yolovchi}
            onChange={(e) => setYolovchi(e.target.value)}
            placeholder="IVANOV/IVAN"
            required
            style={inputStyle}
          />
        </div>

        {/* Passenger count */}
        <div>
          <label style={labelStyle}>Yo&apos;lovchilar soni</label>
          <input
            type="number"
            value={passengerCount}
            onChange={(e) => setPassengerCount(Number(e.target.value) || 1)}
            min={1}
            style={inputStyle}
          />
        </div>

        {/* Tarif + Sotish narxi side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Tarif UZS</label>
            <input
              type="number"
              value={tarif}
              onChange={(e) => setTarif(e.target.value ? Number(e.target.value) : '')}
              placeholder="0"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Sotish narxi UZS</label>
            <input
              type="number"
              value={sotishNarxi}
              onChange={(e) => setSotishNarxi(e.target.value ? Number(e.target.value) : '')}
              placeholder="0"
              required
              style={inputStyle}
            />
          </div>
        </div>

        {/* Foyda */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            backgroundColor: '#0A0F0D',
            border: '1px solid #1E2E24',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#8A9A8F', fontSize: 13 }}>Foyda</span>
          <span
            style={{
              color: foyda >= 0 ? '#7CFF4F' : '#FF4444',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {foyda.toLocaleString('uz-UZ')} so&apos;m
          </span>
        </div>

        {/* Kommentariya */}
        <div>
          <label style={labelStyle}>Kommentariya</label>
          <textarea
            value={izoh}
            onChange={(e) => setIzoh(e.target.value)}
            placeholder="Qo'shimcha izoh yozing..."
            rows={3}
            style={{
              ...inputStyle,
              resize: 'vertical' as const,
              minHeight: 60,
            }}
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
            backgroundColor: '#7CFF4F',
            color: '#0A0F0D',
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Yuklanmoqda...' : 'Bilet yozish'}
        </button>
      </form>
    </div>
  );
}
