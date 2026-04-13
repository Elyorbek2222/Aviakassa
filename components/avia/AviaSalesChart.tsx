'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AviaSalesPoint } from '@/types/avia';
import { formatMoney } from '@/lib/utils';

interface Props {
  data: AviaSalesPoint[];
}

export default function AviaSalesChart({ data }: Props) {
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
        Sotuvlar dinamikasi
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7CFF4F" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7CFF4F" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2E24" />
          <XAxis dataKey="date" stroke="#4A5C50" fontSize={12} />
          <YAxis stroke="#4A5C50" fontSize={12} tickFormatter={(value) => formatMoney(value)} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#141F19',
              border: '1px solid #1E2E24',
              borderRadius: 8,
              color: '#fff',
            }}
            formatter={(value) => [formatMoney(Number(value)), 'Sotuv']}
            labelStyle={{ color: '#8A9A8F' }}
          />
          <Area
            type="monotone"
            dataKey="sotuv"
            stroke="#7CFF4F"
            strokeWidth={2}
            fill="url(#salesGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
