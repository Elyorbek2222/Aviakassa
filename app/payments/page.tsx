'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { CreditCard, Search, Trash2 } from 'lucide-react';
import { formatMoney } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const { data, mutate, isLoading } = useSWR(
    `/api/avia/payments${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const payments = data?.payments || [];

  const handleClear = async () => {
    if (!confirm('Barcha to\'lovlarni tozalashni xohlaysizmi?')) return;
    await fetch('/api/avia/payments', { method: 'DELETE' });
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

  const typeColors: Record<string, string> = {
    naqd: '#7CFF4F',
    plastik: '#2CA5E0',
    perechisleniya: '#9B59B6',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CreditCard size={24} style={{ color: '#2CA5E0' }} />
          To&apos;lovlar
        </h1>
        <button onClick={handleClear} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
          border: '1px solid rgba(255,59,48,0.3)', backgroundColor: 'rgba(255,59,48,0.1)',
          color: '#FF3B30', fontSize: 13, cursor: 'pointer',
        }}>
          <Trash2 size={14} /> Tozalash
        </button>
      </div>

      <div style={{ marginBottom: 16, position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#4A5C50' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Qidirish (bilet raqami, mijoz ismi...)"
          style={{ ...inputStyle, width: '100%', paddingLeft: 36, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 20 }}>
        {isLoading ? (
          <div style={{ color: '#8A9A8F', textAlign: 'center', padding: 40 }}>Yuklanmoqda...</div>
        ) : payments.length === 0 ? (
          <div style={{ color: '#4A5C50', textAlign: 'center', padding: 40, fontSize: 14 }}>To&apos;lov topilmadi</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                  {['Sana', 'Bilet Raqam', 'Mijoz', 'Turi', 'Summa', 'Izoh'].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Summa' ? 'right' : 'left', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p: { id: string; sana: string; biletRaqam: string; mijozIsmi: string; tolovTuri: string; summa: number; izoh?: string }) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #1E2E24' }}>
                    <td style={{ padding: '10px 12px', color: '#8A9A8F', fontSize: 13 }}>{p.sana}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{p.biletRaqam}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{p.mijozIsmi}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        backgroundColor: (typeColors[p.tolovTuri] || '#fff') + '20',
                        color: typeColors[p.tolovTuri] || '#fff',
                      }}>
                        {p.tolovTuri}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#7CFF4F', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{formatMoney(p.summa)}</td>
                    <td style={{ padding: '10px 12px', color: '#4A5C50', fontSize: 13 }}>{p.izoh || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ color: '#4A5C50', fontSize: 12, marginTop: 12, textAlign: 'right' }}>
          Jami: {payments.length} ta to&apos;lov
        </div>
      </div>
    </div>
  );
}
