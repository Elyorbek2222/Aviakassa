'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import type { DebtRecord } from '@/types/avia';
import { AIRLINE_LABELS, type AirlineKey } from '@/types/avia';
import { formatMoney } from '@/lib/utils';

interface Props {
  debts: DebtRecord[];
}

export default function AviaDebtTable({ debts }: Props) {
  const allDebts = debts ?? [];
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const safeDebts = q
    ? allDebts.filter((d) =>
        `${d.mijozIsmi} ${d.biletRaqam} ${d.sana} ${d.izoh || ''}`.toLowerCase().includes(q)
      )
    : allDebts;
  const totalQarz = safeDebts.reduce((sum, d) => sum + d.qarz, 0);

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    color: '#8A9A8F',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    borderBottom: '1px solid #1E2E24',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 14px',
    fontSize: 14,
    borderBottom: '1px solid #1E2E24',
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
      {/* Alert banner */}
      {totalQarz > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            backgroundColor: '#FF444415',
            border: '1px solid #FF444440',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#FF4444', fontSize: 14, fontWeight: 500 }}>
            Jami qarzdorlik
          </span>
          <span style={{ color: '#FF4444', fontSize: 20, fontWeight: 700 }}>
            {formatMoney(totalQarz)} so&apos;m
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: 0 }}>
          Qarzdorlik jadvali
        </h3>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#4A5C50' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mijoz, bilet yoki izoh bo'yicha qidirish…"
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid #1E2E24', backgroundColor: '#0A0F0D', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Mijoz</th>
              <th style={thStyle}>Izoh</th>
              <th style={thStyle}>Bilet raqam</th>
              <th style={thStyle}>Aviakompaniya</th>
              <th style={thStyle}>Bilet narxi</th>
              <th style={thStyle}>To&apos;langan</th>
              <th style={thStyle}>Qarz</th>
            </tr>
          </thead>
          <tbody>
            {safeDebts.map((d, idx) => (
              <tr key={d.biletId || `debt-${idx}`}>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 500 }}>{d.mijozIsmi}</td>
                <td style={{ ...tdStyle, color: d.izoh ? '#c8d8cc' : '#4A5C50' }}>{d.izoh || '—'}</td>
                <td style={{ ...tdStyle, color: '#fff', fontFamily: 'monospace' }}>{d.biletRaqam}</td>
                <td style={{ ...tdStyle, color: '#8A9A8F' }}>
                  {AIRLINE_LABELS[d.airline as AirlineKey] || d.airline}
                </td>
                <td style={{ ...tdStyle, color: '#fff' }}>{formatMoney(d.sotishNarxi)}</td>
                <td style={{ ...tdStyle, color: '#7CFF4F' }}>{formatMoney(d.tolangan)}</td>
                <td
                  style={{
                    ...tdStyle,
                    color: d.qarz > 0 ? '#FF4444' : '#7CFF4F',
                    fontWeight: 700,
                  }}
                >
                  {formatMoney(d.qarz)}
                </td>
              </tr>
            ))}
            {safeDebts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, color: '#4A5C50', textAlign: 'center' }}>
                  {q ? 'Topilmadi' : 'Qarzdorlik yo\'q'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
