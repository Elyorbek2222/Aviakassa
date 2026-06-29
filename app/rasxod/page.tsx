'use client';

import useSWR from 'swr';
import { ArrowDownRight, TrendingDown } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import RasxodForm from '@/components/avia/RasxodForm';
import RefundForm from '@/components/avia/RefundForm';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const cardStyle: React.CSSProperties = {
  backgroundColor: '#141F19',
  border: '1px solid #1E2E24',
  borderRadius: 14,
  padding: 24,
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  color: '#4A5C50',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  borderBottom: '1px solid #1E2E24',
};

export default function RasxodPage() {
  const today = new Date().toISOString().split('T')[0];
  const { data: rasxodData, mutate: mutateRasxod } = useSWR('/api/avia/rasxod', fetcher, { refreshInterval: 60000 });
  const { data: refundData, mutate: mutateRefund } = useSWR('/api/avia/refund', fetcher, { refreshInterval: 60000 });

  const rasxodlar = (rasxodData?.rasxodlar || []).filter((r: { sana: string }) => r.sana === today);
  const refundlar = (refundData?.refundlar || []).filter((r: { sana: string }) => r.sana === today);

  const jamiRasxod = rasxodlar.reduce((s: number, r: { summa: number }) => s + r.summa, 0);
  const jamiRefund = refundlar.reduce((s: number, r: { summa: number }) => s + r.summa, 0);

  const refresh = () => { mutateRasxod(); mutateRefund(); };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
          Rasxod / Refund
        </h1>
        <div style={{ color: '#4A5C50', fontSize: 12 }}>
          {new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...cardStyle, borderTop: '2px solid #FF5C5C50' }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ArrowDownRight size={16} style={{ color: '#FF5C5C' }} />
              Rasxod (Chiqim)
            </h3>
            <RasxodForm onSuccess={refresh} />
          </div>

          <div style={{ ...cardStyle, borderTop: '2px solid #F5A62350' }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingDown size={16} style={{ color: '#F5A623' }} />
              Refund (Pul qaytarish)
            </h3>
            <RefundForm onSuccess={refresh} />
          </div>
        </div>

        {/* Right: Today's lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Totals */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ ...cardStyle, padding: '14px 16px', border: '1px solid #FF5C5C25', display: 'flex', alignItems: 'center', gap: 10 }}>
              <ArrowDownRight size={18} style={{ color: '#FF5C5C', flexShrink: 0 }} />
              <div>
                <div style={{ color: '#4A5C50', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em' }}>RASXOD (BUGUN)</div>
                <div style={{ color: '#FF5C5C', fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  −{formatMoney(jamiRasxod)}
                </div>
              </div>
            </div>
            <div style={{ ...cardStyle, padding: '14px 16px', border: '1px solid #F5A62325', display: 'flex', alignItems: 'center', gap: 10 }}>
              <TrendingDown size={18} style={{ color: '#F5A623', flexShrink: 0 }} />
              <div>
                <div style={{ color: '#4A5C50', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em' }}>REFUND (BUGUN)</div>
                <div style={{ color: '#F5A623', fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  −{formatMoney(jamiRefund)}
                </div>
              </div>
            </div>
          </div>

          {/* Today's Rasxod list */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>Bugungi Rasxodlar</h3>
              {rasxodlar.length > 0 && <span style={{ color: '#4A5C50', fontSize: 11, fontWeight: 600 }}>{rasxodlar.length} ta</span>}
            </div>
            {rasxodlar.length === 0 ? (
              <div style={{ color: '#4A5C50', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>Bugun rasxod yo&apos;q</div>
            ) : (
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Sabab</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Summa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rasxodlar.map((r: { id: string; sabab: string; summa: number }) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #1E2E24' }}>
                        <td style={{ padding: '9px 12px', color: '#fff', fontSize: 13 }}>{r.sabab}</td>
                        <td style={{ padding: '9px 12px', color: '#FF5C5C', fontSize: 13, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          −{formatMoney(r.summa)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Today's Refund list */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>Bugungi Refundlar</h3>
              {refundlar.length > 0 && <span style={{ color: '#4A5C50', fontSize: 11, fontWeight: 600 }}>{refundlar.length} ta</span>}
            </div>
            {refundlar.length === 0 ? (
              <div style={{ color: '#4A5C50', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>Bugun refund yo&apos;q</div>
            ) : (
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Bilet</th>
                      <th style={tableHeaderStyle}>Mijoz</th>
                      <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Summa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundlar.map((r: { id: string; biletRaqam: string; mijozIsmi: string; summa: number }) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #1E2E24' }}>
                        <td style={{ padding: '9px 12px', color: '#8A9A8F', fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>{r.biletRaqam || '—'}</td>
                        <td style={{ padding: '9px 12px', color: '#fff', fontSize: 13 }}>{r.mijozIsmi}</td>
                        <td style={{ padding: '9px 12px', color: '#F5A623', fontSize: 13, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          −{formatMoney(r.summa)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
