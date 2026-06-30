'use client';

import useSWR from 'swr';
import { AlertTriangle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DebtItem {
  biletRaqam: string;
  mijozIsmi: string;
  sotishNarxi: number;
  tolangan: number;
  qarz: number;
  sana: string;
  airline: string;
}

function formatMoney(n: number): string {
  return n.toLocaleString('uz-UZ') + " so'm";
}

export default function BegzodDebtsPage() {
  const { data } = useSWR('/api/avia/reports', fetcher);

  // Faqat Begzod yozgan biletlarning qarzlarini ko'rsatish
  const allDebts: DebtItem[] = data?.debts || [];
  // Agar agent filtrlanmagan bo'lsa — hamma qarzlarni ko'rsatamiz (chunki Begzod o'zining biletlarini ko'rishi kerak)
  const debts = allDebts;
  const totalQarz = debts.reduce((s: number, d: DebtItem) => s + d.qarz, 0);

  return (
    <div>
      <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Qarzdorlar
      </h1>

      {/* Jami qarz banner */}
      {totalQarz > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderRadius: 12,
            backgroundColor: '#FF5C5C15',
            border: '1px solid #FF5C5C30',
            marginBottom: 20,
          }}
        >
          <AlertTriangle size={24} color="#FF5C5C" />
          <div>
            <div style={{ color: '#FF5C5C', fontSize: 16, fontWeight: 700 }}>
              Jami qarzdorlik: {formatMoney(totalQarz)}
            </div>
            <div style={{ color: '#8A9A8F', fontSize: 13 }}>
              {debts.length} ta bilet uchun to&apos;lov kutilmoqda
            </div>
          </div>
        </div>
      )}

      {debts.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: '#7CFF4F',
            backgroundColor: '#141F19',
            borderRadius: 12,
            border: '1px solid #1E2E24',
          }}
        >
          Qarzdorlik yo&apos;q — barcha biletlar to&apos;langan
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#141F19',
            borderRadius: 12,
            border: '1px solid #1E2E24',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#111815' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#8A9A8F', fontWeight: 500 }}>Sana</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#8A9A8F', fontWeight: 500 }}>Bilet raqam</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#8A9A8F', fontWeight: 500 }}>Yo&apos;lovchi</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#8A9A8F', fontWeight: 500 }}>Airline</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#8A9A8F', fontWeight: 500 }}>Bilet narxi</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#8A9A8F', fontWeight: 500 }}>To&apos;langan</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#8A9A8F', fontWeight: 500 }}>Qarz</th>
              </tr>
            </thead>
            <tbody>
              {debts.map((d: DebtItem, i: number) => (
                <tr key={i} style={{ borderTop: '1px solid #1E2E24' }}>
                  <td style={{ padding: '12px 16px', color: '#fff' }}>{d.sana}</td>
                  <td style={{ padding: '12px 16px', color: '#F5A623', fontFamily: 'monospace' }}>{d.biletRaqam || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#fff', fontWeight: 500 }}>{d.mijozIsmi}</td>
                  <td style={{ padding: '12px 16px', color: '#8A9A8F' }}>{d.airline}</td>
                  <td style={{ padding: '12px 16px', color: '#fff', textAlign: 'right' }}>{formatMoney(d.sotishNarxi)}</td>
                  <td style={{ padding: '12px 16px', color: '#7CFF4F', textAlign: 'right' }}>{formatMoney(d.tolangan)}</td>
                  <td style={{ padding: '12px 16px', color: '#FF5C5C', textAlign: 'right', fontWeight: 700 }}>{formatMoney(d.qarz)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
