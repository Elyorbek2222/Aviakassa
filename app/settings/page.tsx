'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Sliders, Save } from 'lucide-react';
import type { AirlineConfig } from '@/types/avia';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SettingsPage() {
  const { data, mutate } = useSWR('/api/avia/settings', fetcher);
  const [airlines, setAirlines] = useState<AirlineConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (data?.settings?.airlines) {
      setAirlines(data.settings.airlines);
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/avia/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airlines }),
      });

      if (res.ok) {
        setMessage('Saqlandi!');
        mutate();
      } else {
        setMessage('Xatolik');
      }
    } catch {
      setMessage('Serverga ulanib bo\'lmadi');
    } finally {
      setSaving(false);
    }
  };

  const updateAirline = (index: number, field: keyof AirlineConfig, value: string | number | boolean) => {
    const updated = [...airlines];
    updated[index] = { ...updated[index], [field]: value };
    setAirlines(updated);
  };

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #1E2E24',
    backgroundColor: '#0A0F0D',
    color: '#fff',
    fontSize: 13,
    outline: 'none',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sliders size={24} style={{ color: '#7CFF4F' }} />
          Sozlamalar
        </h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {message && (
            <span style={{ color: message === 'Saqlandi!' ? '#7CFF4F' : '#FF3B30', fontSize: 13 }}>
              {message}
            </span>
          )}
          <button onClick={handleSave} disabled={saving} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8,
            border: 'none', backgroundColor: '#7CFF4F', color: '#0A0F0D', fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            <Save size={16} />
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
          Aviakompaniyalar
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1E2E24' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>Kalit</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>Nomi</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>Komissiya %</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>Aktiv</th>
            </tr>
          </thead>
          <tbody>
            {airlines.map((airline, i) => (
              <tr key={airline.key} style={{ borderBottom: '1px solid #1E2E24' }}>
                <td style={{ padding: '10px 12px', color: '#4A5C50', fontSize: 13, fontFamily: 'monospace' }}>{airline.key}</td>
                <td style={{ padding: '10px 12px' }}>
                  <input
                    type="text"
                    value={airline.name}
                    onChange={(e) => updateAirline(i, 'name', e.target.value)}
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <input
                    type="number"
                    value={airline.komissiya}
                    onChange={(e) => updateAirline(i, 'komissiya', Number(e.target.value))}
                    min={0}
                    max={100}
                    style={{ ...inputStyle, width: 80, textAlign: 'center' }}
                  />
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={airline.active}
                    onChange={(e) => updateAirline(i, 'active', e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#7CFF4F', cursor: 'pointer' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
