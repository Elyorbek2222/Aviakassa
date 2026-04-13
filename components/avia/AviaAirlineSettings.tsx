'use client';

import { useState } from 'react';
import type { AirlineConfig, AirlineKey } from '@/types/avia';
import { AIRLINE_LABELS } from '@/types/avia';

export default function AviaAirlineSettings() {
  const [airlines, setAirlines] = useState<AirlineConfig[]>(
    (Object.entries(AIRLINE_LABELS) as [AirlineKey, string][]).map(([key, name]) => ({
      key,
      name,
      komissiya: 0,
      active: true,
    }))
  );
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleKomissiyaChange = (key: string, value: number) => {
    setAirlines((prev) =>
      prev.map((a) => (a.key === key ? { ...a, komissiya: value } : a))
    );
  };

  const handleToggle = (key: string) => {
    setAirlines((prev) =>
      prev.map((a) => (a.key === key ? { ...a, active: !a.active } : a))
    );
  };

  const handleAddAirline = () => {
    if (!newName.trim()) return;
    const key = newName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') as AirlineKey;
    if (airlines.find((a) => a.key === key)) return;
    setAirlines((prev) => [
      ...prev,
      { key, name: newName.trim(), komissiya: 0, active: true },
    ]);
    setNewName('');
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/avia/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airlines }),
      });
      if (!res.ok) throw new Error('Xatolik');
      setMessage('Saqlandi!');
    } catch {
      setMessage('Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #1E2E24',
    backgroundColor: '#0A0F0D',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
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
        Aviakompaniya sozlamalari
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {airlines.map((a) => (
          <div
            key={a.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 8,
              backgroundColor: '#0A0F0D',
              border: '1px solid #1E2E24',
              opacity: a.active ? 1 : 0.5,
            }}
          >
            {/* Toggle */}
            <button
              onClick={() => handleToggle(a.key)}
              style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                border: 'none',
                backgroundColor: a.active ? '#7CFF4F' : '#1E2E24',
                position: 'relative',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: a.active ? 21 : 3,
                  transition: 'left 0.15s ease',
                }}
              />
            </button>

            {/* Name */}
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 500, flex: 1 }}>
              {a.name}
            </span>

            {/* Komissiya */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#8A9A8F', fontSize: 12 }}>Komissiya:</span>
              <input
                type="number"
                value={a.komissiya}
                onChange={(e) => handleKomissiyaChange(a.key, Number(e.target.value))}
                min={0}
                max={100}
                step={0.1}
                style={{ ...inputStyle, width: 80, textAlign: 'right' }}
              />
              <span style={{ color: '#8A9A8F', fontSize: 14 }}>%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Yangi aviakompaniya nomi"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={handleAddAirline}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #1E2E24',
            backgroundColor: '#141F19',
            color: '#7CFF4F',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          + Qo&apos;shish
        </button>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#7CFF4F',
            color: '#0A0F0D',
            fontSize: 15,
            fontWeight: 700,
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
        {message && (
          <span style={{ color: message === 'Saqlandi!' ? '#7CFF4F' : '#FF4444', fontSize: 13 }}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
