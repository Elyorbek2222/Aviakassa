'use client';

import useSWR from 'swr';
import { Landmark } from 'lucide-react';
import { formatMoney } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function InkassatsiyaPage() {
  const { data, isLoading } = useSWR('/api/avia/inkassatsiya', fetcher, { refreshInterval: 15000 });

  const items = data?.inkassatsiya || [];
  const total = items.reduce((s: number, i: { summa: number }) => s + i.summa, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Landmark size={24} style={{ color: '#9B59B6' }} />
          Inkassatsiya Tarixi
        </h1>
        {total > 0 && (
          <div style={{
            padding: '8px 16px', borderRadius: 8,
            backgroundColor: 'rgba(155,89,182,0.1)', border: '1px solid rgba(155,89,182,0.3)',
            color: '#9B59B6', fontSize: 14, fontWeight: 600,
          }}>
            Jami: {formatMoney(total)}
          </div>
        )}
      </div>

      <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 20 }}>
        {isLoading ? (
          <div style={{ color: '#8A9A8F', textAlign: 'center', padding: 40 }}>Yuklanmoqda...</div>
        ) : items.length === 0 ? (
          <div style={{ color: '#4A5C50', textAlign: 'center', padding: 40, fontSize: 14 }}>
            Inkassatsiya yo&apos;q
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                  {['Sana', 'Aviakompaniya', 'Summa', 'Izoh'].map((h) => (
                    <th key={h} style={{
                      padding: '10px 12px',
                      textAlign: h === 'Summa' ? 'right' : 'left',
                      color: '#8A9A8F', fontSize: 13, fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.slice().reverse().map((i: { id: string; sana: string; airlineName: string; summa: number; izoh?: string }) => (
                  <tr key={i.id} style={{ borderBottom: '1px solid #1E2E24' }}>
                    <td style={{ padding: '10px 12px', color: '#8A9A8F', fontSize: 13 }}>{i.sana}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{i.airlineName}</td>
                    <td style={{ padding: '10px 12px', color: '#9B59B6', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{formatMoney(i.summa)}</td>
                    <td style={{ padding: '10px 12px', color: '#4A5C50', fontSize: 13 }}>{i.izoh || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
