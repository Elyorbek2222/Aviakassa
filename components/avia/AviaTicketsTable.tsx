'use client';

import { useState, useMemo } from 'react';
import type { AviaTicket } from '@/types/avia';
import { formatMoney } from '@/lib/utils';

interface Props {
  tickets: AviaTicket[];
}

type SortKey = 'sana' | 'biletRaqam' | 'yolovchi' | 'airlineName' | 'tarif' | 'sotishNarxi' | 'agent';

export default function AviaTicketsTable({ tickets }: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('sana');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const safeTickets = tickets ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = safeTickets;
    if (q) {
      result = safeTickets.filter(
        (t) =>
          (t.biletRaqam ?? '').toLowerCase().includes(q) ||
          (t.yolovchi ?? '').toLowerCase().includes(q) ||
          (t.airlineName ?? '').toLowerCase().includes(q) ||
          (t.agent ?? '').toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return result;
  }, [safeTickets, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    color: '#8A9A8F',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    borderBottom: '1px solid #1E2E24',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 14px',
    fontSize: 14,
    borderBottom: '1px solid #1E2E24',
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Biletlar</h3>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Qidirish..."
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #1E2E24',
            backgroundColor: '#0A0F0D',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
            width: 240,
          }}
        />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle} onClick={() => handleSort('sana')}>Sana{sortIndicator('sana')}</th>
              <th style={thStyle} onClick={() => handleSort('biletRaqam')}>Bilet raqam{sortIndicator('biletRaqam')}</th>
              <th style={thStyle} onClick={() => handleSort('yolovchi')}>Yo&apos;lovchi{sortIndicator('yolovchi')}</th>
              <th style={thStyle} onClick={() => handleSort('airlineName')}>Aviakompaniya{sortIndicator('airlineName')}</th>
              <th style={thStyle} onClick={() => handleSort('tarif')}>Tarif{sortIndicator('tarif')}</th>
              <th style={thStyle} onClick={() => handleSort('sotishNarxi')}>Sotish narxi{sortIndicator('sotishNarxi')}</th>
              <th style={thStyle}>Foyda</th>
              <th style={thStyle} onClick={() => handleSort('agent')}>Agent{sortIndicator('agent')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const foyda = t.sotishNarxi - t.tarif;
              return (
                <tr key={t.id}>
                  <td style={{ ...tdStyle, color: '#8A9A8F' }}>{t.sana}</td>
                  <td style={{ ...tdStyle, color: '#fff', fontFamily: 'monospace' }}>{t.biletRaqam}</td>
                  <td style={{ ...tdStyle, color: '#fff' }}>{t.yolovchi}</td>
                  <td style={{ ...tdStyle, color: '#8A9A8F' }}>{t.airlineName}</td>
                  <td style={{ ...tdStyle, color: '#8A9A8F' }}>{formatMoney(t.tarif)}</td>
                  <td style={{ ...tdStyle, color: '#fff' }}>{formatMoney(t.sotishNarxi)}</td>
                  <td
                    style={{
                      ...tdStyle,
                      color: foyda >= 0 ? '#7CFF4F' : '#FF4444',
                      fontWeight: 700,
                    }}
                  >
                    {foyda >= 0 ? '+' : ''}{formatMoney(foyda)}
                  </td>
                  <td style={{ ...tdStyle, color: '#8A9A8F' }}>{t.agent}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, color: '#4A5C50', textAlign: 'center' }}>
                  {search ? 'Natija topilmadi' : "Ma'lumot yo'q"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
