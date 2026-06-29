'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { AviaSalesPoint } from '@/types/avia';
import { formatMoney } from '@/lib/utils';
import { UZ_MONTHS } from '@/lib/period';

interface Props {
  data: AviaSalesPoint[];
}

// Kunlik salesTrend -> oyma-oy (YYYY-MM) guruhlangan ko'rsatkichlar.
export default function AviaMonthlyChart({ data }: Props) {
  const map = new Map<string, { sotuv: number; biletlar: number }>();
  for (const p of data) {
    const ym = (p.date || '').slice(0, 7);
    if (!ym) continue;
    const e = map.get(ym) || { sotuv: 0, biletlar: 0 };
    e.sotuv += p.sotuv;
    e.biletlar += p.biletlar;
    map.set(ym, e);
  }
  const chartData = Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, v]) => {
      const [y, m] = ym.split('-');
      return { name: `${(UZ_MONTHS[Number(m) - 1] || '').slice(0, 3)} ${y.slice(2)}`, sotuv: v.sotuv, biletlar: v.biletlar };
    });

  return (
    <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 20 }}>
      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
        Oylik sotuv (oyma-oy)
      </h3>
      {chartData.length === 0 ? (
        <div style={{ color: '#4A5C50', textAlign: 'center', padding: 40, fontSize: 14 }}>Ma&apos;lumot yo&apos;q</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2E24" />
            <XAxis dataKey="name" stroke="#4A5C50" fontSize={11} />
            <YAxis yAxisId="left" stroke="#4A5C50" fontSize={11} tickFormatter={(value) => formatMoney(value)} />
            <YAxis yAxisId="right" orientation="right" stroke="#4A5C50" fontSize={11} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 8, color: '#fff' }}
              labelStyle={{ color: '#8A9A8F' }}
              formatter={(value, name) => name === 'Sotuv' ? [formatMoney(Number(value)), 'Sotuv'] : [value, 'Biletlar']}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="sotuv" name="Sotuv" fill="#2CA5E0" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="biletlar" name="Biletlar" fill="#7CFF4F" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
