'use client';

import type { AviaPayment } from '@/types/avia';
import { formatMoney } from '@/lib/utils';

interface Props {
  payments: AviaPayment[];
}

const PAYMENT_BADGE: Record<string, { label: string; color: string }> = {
  naqd: { label: 'Naqd', color: '#7CFF4F' },
  plastik: { label: 'Plastik', color: '#F5A623' },
  perechisleniya: { label: 'Perechisleniya', color: '#2CA5E0' },
};

export default function AviaPaymentsTable({ payments }: Props) {
  const safePayments = payments ?? [];
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
        To&apos;lovlar
      </h3>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Sana</th>
              <th style={thStyle}>Bilet raqam</th>
              <th style={thStyle}>Mijoz</th>
              <th style={thStyle}>Summa</th>
              <th style={thStyle}>To&apos;lov turi</th>
              <th style={thStyle}>Izoh</th>
            </tr>
          </thead>
          <tbody>
            {safePayments.map((p) => {
              const badge = PAYMENT_BADGE[p.tolovTuri] || { label: p.tolovTuri, color: '#8A9A8F' };
              const summaDisplay =
                p.valyuta === 'usd' && p.summAsl && p.kurs
                  ? `$${p.summAsl} x ${p.kurs.toLocaleString('uz-UZ')}`
                  : formatMoney(p.summa);

              return (
                <tr key={p.id}>
                  <td style={{ ...tdStyle, color: '#8A9A8F' }}>{p.sana}</td>
                  <td style={{ ...tdStyle, color: '#fff', fontFamily: 'monospace' }}>{p.biletRaqam}</td>
                  <td style={{ ...tdStyle, color: '#fff' }}>{p.mijozIsmi}</td>
                  <td style={{ ...tdStyle, color: '#fff' }}>
                    {summaDisplay}
                    {p.valyuta === 'usd' && (
                      <div style={{ color: '#4A5C50', fontSize: 11 }}>
                        = {formatMoney(p.summa)} UZS
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 6,
                        backgroundColor: badge.color + '20',
                        color: badge.color,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: '#4A5C50' }}>{p.izoh || '—'}</td>
                </tr>
              );
            })}
            {safePayments.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, color: '#4A5C50', textAlign: 'center' }}>
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
