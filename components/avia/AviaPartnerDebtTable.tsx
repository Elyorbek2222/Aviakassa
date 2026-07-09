'use client';

import type { PartnerDebt } from '@/types/avia';
import { AIRLINE_LABELS, type AirlineKey } from '@/types/avia';
import { formatMoney } from '@/lib/utils';

interface Props {
  debts: PartnerDebt[];
}

export default function AviaPartnerDebtTable({ debts }: Props) {
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
      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
        Partnyorlar qarzi
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Partnyor</th>
              <th style={thStyle}>Biletlar</th>
              <th style={thStyle}>Biletlar summasi</th>
              <th style={thStyle}>To&apos;langan</th>
              <th style={thStyle}>Qarz</th>
            </tr>
          </thead>
          <tbody>
            {debts.map((d) => (
              <tr key={d.airline}>
                <td style={{ ...tdStyle, color: '#fff', fontWeight: 500 }}>
                  {AIRLINE_LABELS[d.airline as AirlineKey] || d.airline}
                </td>
                <td style={{ ...tdStyle, color: '#8A9A8F' }}>{d.biletlar}</td>
                <td style={{ ...tdStyle, color: '#fff' }}>{formatMoney(d.biletlarSumma)}</td>
                <td style={{ ...tdStyle, color: '#7CFF4F' }}>{formatMoney(d.inkassatsiya)}</td>
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
            {debts.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, color: '#4A5C50', textAlign: 'center' }}>
                  Ma&apos;lumot yo&apos;q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
