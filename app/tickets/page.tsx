'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { FileText, Search, Trash2 } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { AIRLINE_LABELS } from '@/types/avia';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TicketsPage() {
  const [search, setSearch] = useState('');
  const { data, mutate, isLoading } = useSWR(
    `/api/avia/tickets${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const tickets = data?.tickets || [];

  const handleClear = async () => {
    if (!confirm('Barcha biletlarni tozalashni xohlaysizmi?')) return;
    await fetch('/api/avia/tickets', { method: 'DELETE' });
    mutate();
  };

  const inputStyle = {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #1E2E24',
    backgroundColor: '#0A0F0D',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={24} style={{ color: '#7CFF4F' }} />
          Biletlar
        </h1>
        <button onClick={handleClear} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
          border: '1px solid rgba(255,59,48,0.3)', backgroundColor: 'rgba(255,59,48,0.1)',
          color: '#FF3B30', fontSize: 13, cursor: 'pointer',
        }}>
          <Trash2 size={14} /> Tozalash
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#4A5C50' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Qidirish (bilet raqami, yo'lovchi...)"
          style={{ ...inputStyle, width: '100%', paddingLeft: 36, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 20 }}>
        {isLoading ? (
          <div style={{ color: '#8A9A8F', textAlign: 'center', padding: 40 }}>Yuklanmoqda...</div>
        ) : tickets.length === 0 ? (
          <div style={{ color: '#4A5C50', textAlign: 'center', padding: 40, fontSize: 14 }}>Bilet topilmadi</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                  {['Sana', 'Bilet Raqam', 'Yo\'lovchi', 'Airline', 'Tarif', 'Sotish Narxi', 'Agent'].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Tarif' || h === 'Sotish Narxi' ? 'right' : 'left', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map((t: { id: string; sana: string; biletRaqam: string; yolovchi: string; airline: string; airlineName: string; tarif: number; sotishNarxi: number; agent: string }) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #1E2E24' }}>
                    <td style={{ padding: '10px 12px', color: '#8A9A8F', fontSize: 13 }}>{t.sana}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{t.biletRaqam}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{t.yolovchi}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{t.airlineName || AIRLINE_LABELS[t.airline as keyof typeof AIRLINE_LABELS] || t.airline}</td>
                    <td style={{ padding: '10px 12px', color: '#8A9A8F', fontSize: 13, textAlign: 'right' }}>{formatMoney(t.tarif)}</td>
                    <td style={{ padding: '10px 12px', color: '#7CFF4F', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{formatMoney(t.sotishNarxi)}</td>
                    <td style={{ padding: '10px 12px', color: '#8A9A8F', fontSize: 13 }}>{t.agent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ color: '#4A5C50', fontSize: 12, marginTop: 12, textAlign: 'right' }}>
          Jami: {tickets.length} ta bilet
        </div>
      </div>
    </div>
  );
}
