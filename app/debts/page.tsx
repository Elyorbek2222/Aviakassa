'use client';

import useSWR from 'swr';
import { AlertTriangle } from 'lucide-react';
import { formatMoney } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DebtsPage() {
  const { data, isLoading } = useSWR('/api/avia/reports', fetcher, { refreshInterval: 30000 });

  const debts = data?.debts || [];
  const totalQarz = debts.reduce((s: number, d: { qarz: number }) => s + d.qarz, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={24} style={{ color: '#FF3B30' }} />
          Qarzdorlik
        </h1>
        {totalQarz > 0 && (
          <div style={{
            padding: '8px 16px', borderRadius: 8,
            backgroundColor: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)',
            color: '#FF3B30', fontSize: 14, fontWeight: 600,
          }}>
            Jami: {formatMoney(totalQarz)}
          </div>
        )}
      </div>

      <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 20 }}>
        {isLoading ? (
          <div style={{ color: '#8A9A8F', textAlign: 'center', padding: 40 }}>Yuklanmoqda...</div>
        ) : debts.length === 0 ? (
          <div style={{ color: '#7CFF4F', textAlign: 'center', padding: 40, fontSize: 14 }}>
            Qarzdorlik yo&apos;q
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                  {['Sana', 'Bilet Raqam', 'Mijoz', 'Sotish Narxi', 'To\'langan', 'Qarz'].map((h) => (
                    <th key={h} style={{
                      padding: '10px 12px',
                      textAlign: ['Sotish Narxi', 'To\'langan', 'Qarz'].includes(h) ? 'right' : 'left',
                      color: '#8A9A8F', fontSize: 13, fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {debts.map((d: { biletId: string; sana: string; biletRaqam: string; mijozIsmi: string; sotishNarxi: number; tolangan: number; qarz: number }) => (
                  <tr key={d.biletId} style={{ borderBottom: '1px solid #1E2E24' }}>
                    <td style={{ padding: '10px 12px', color: '#8A9A8F', fontSize: 13 }}>{d.sana}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{d.biletRaqam}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{d.mijozIsmi}</td>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13, textAlign: 'right' }}>{formatMoney(d.sotishNarxi)}</td>
                    <td style={{ padding: '10px 12px', color: '#7CFF4F', fontSize: 13, textAlign: 'right' }}>{formatMoney(d.tolangan)}</td>
                    <td style={{ padding: '10px 12px', color: '#FF3B30', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{formatMoney(d.qarz)}</td>
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
