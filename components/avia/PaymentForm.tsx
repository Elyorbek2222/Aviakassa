'use client';

import { useState, FormEvent } from 'react';
import type { Valyuta, PaymentType } from '@/types/avia';

interface Props {
  onSuccess?: () => void;
}

export default function PaymentForm({ onSuccess }: Props) {
  const [biletRaqam, setBiletRaqam] = useState('');
  const [mijozIsmi, setMijozIsmi] = useState('');
  const [biletNarxi, setBiletNarxi] = useState<number>(0);
  const [qolganQarz, setQolganQarz] = useState<number>(0);
  const [valyuta, setValyuta] = useState<Valyuta>('uzs');
  const [summa, setSumma] = useState<number | ''>('');
  const [summAsl, setSummAsl] = useState<number | ''>('');
  const [kurs, setKurs] = useState<number>(12800);
  const [tolovTuri, setTolovTuri] = useState<PaymentType>('naqd');
  const [izoh, setIzoh] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const uzsFromUsd = typeof summAsl === 'number' ? summAsl * kurs : 0;

  const handleBiletBlur = async () => {
    if (!biletRaqam.trim()) return;
    try {
      const res = await fetch(`/api/avia/tickets?biletRaqam=${encodeURIComponent(biletRaqam)}`);
      if (res.ok) {
        const data = await res.json();
        const tickets = Array.isArray(data) ? data : data.tickets;
        if (tickets && tickets.length > 0) {
          const ticket = tickets[0];
          setMijozIsmi(ticket.yolovchi || '');
          setBiletNarxi(ticket.sotishNarxi || 0);
          setQolganQarz(ticket.sotishNarxi || 0);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const finalSumma = valyuta === 'usd' ? uzsFromUsd : Number(summa);

    try {
      const res = await fetch('/api/avia/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          biletRaqam,
          mijozIsmi,
          valyuta,
          summAsl: valyuta === 'usd' ? Number(summAsl) : undefined,
          kurs: valyuta === 'usd' ? kurs : undefined,
          summa: finalSumma,
          tolovTuri,
          izoh: izoh || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Xatolik yuz berdi');
      }

      setBiletRaqam('');
      setMijozIsmi('');
      setBiletNarxi(0);
      setQolganQarz(0);
      setSumma('');
      setSummAsl('');
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

  const readonlyStyle: React.CSSProperties = {
    ...inputStyle,
    backgroundColor: '#111815',
    color: '#8A9A8F',
    cursor: 'not-allowed',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#8A9A8F',
    fontSize: 13,
    marginBottom: 6,
    fontWeight: 500,
  };

  const paymentTypes: { value: PaymentType; label: string; color: string }[] = [
    { value: 'naqd', label: 'Naqd', color: '#7CFF4F' },
    { value: 'plastik', label: 'Plastik', color: '#F5A623' },
    { value: 'perechisleniya', label: 'Perechisleniya', color: '#2CA5E0' },
  ];

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
        Prixod kirgizish
      </h3>

      {error && (
        <div style={{ color: '#FF4444', fontSize: 13, marginBottom: 12, padding: '8px 12px', backgroundColor: '#FF444420', borderRadius: 8 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Bilet raqam */}
        <div>
          <label style={labelStyle}>Bilet raqami</label>
          <input
            type="text"
            value={biletRaqam}
            onChange={(e) => setBiletRaqam(e.target.value)}
            onBlur={handleBiletBlur}
            placeholder="555-1234567890"
            required
            style={inputStyle}
          />
        </div>

        {/* Auto-filled fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Yo&apos;lovchi ismi</label>
            <input type="text" value={mijozIsmi} readOnly style={readonlyStyle} />
          </div>
          <div>
            <label style={labelStyle}>Bilet narxi</label>
            <input type="text" value={biletNarxi.toLocaleString('uz-UZ')} readOnly style={readonlyStyle} />
          </div>
          <div>
            <label style={labelStyle}>Qolgan qarz</label>
            <input
              type="text"
              value={qolganQarz.toLocaleString('uz-UZ')}
              readOnly
              style={{ ...readonlyStyle, color: qolganQarz > 0 ? '#FF4444' : '#7CFF4F' }}
            />
          </div>
        </div>

        {/* Valyuta toggle */}
        <div>
          <label style={labelStyle}>Valyuta</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['uzs', 'usd'] as Valyuta[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setValyuta(v)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: '1px solid #1E2E24',
                  backgroundColor: valyuta === v ? '#7CFF4F20' : '#0A0F0D',
                  color: valyuta === v ? '#7CFF4F' : '#8A9A8F',
                  fontWeight: valyuta === v ? 700 : 400,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Amount fields */}
        {valyuta === 'usd' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Dollar summasi</label>
              <input
                type="number"
                value={summAsl}
                onChange={(e) => setSummAsl(e.target.value ? Number(e.target.value) : '')}
                placeholder="0"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Kurs</label>
              <input
                type="number"
                value={kurs}
                onChange={(e) => setKurs(Number(e.target.value) || 12800)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>UZS summa</label>
              <input
                type="text"
                value={uzsFromUsd.toLocaleString('uz-UZ')}
                readOnly
                style={readonlyStyle}
              />
            </div>
          </div>
        ) : (
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
        )}

        {/* To'lov turi */}
        <div>
          <label style={labelStyle}>To&apos;lov turi</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {paymentTypes.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => setTolovTuri(pt.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${tolovTuri === pt.value ? pt.color : '#1E2E24'}`,
                  backgroundColor: tolovTuri === pt.value ? pt.color + '20' : '#0A0F0D',
                  color: tolovTuri === pt.value ? pt.color : '#8A9A8F',
                  fontWeight: tolovTuri === pt.value ? 700 : 400,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {pt.label}
              </button>
            ))}
          </div>
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
            backgroundColor: '#7CFF4F',
            color: '#0A0F0D',
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Yuklanmoqda...' : 'Prixod kirgizish'}
        </button>
      </form>
    </div>
  );
}
