'use client';

import { Calendar } from 'lucide-react';
import { monthOptions } from '@/lib/period';

interface Props {
  value: string;
  onChange: (key: string) => void;
  /** "today" tugmasini ko'rsatish (kunlik ish sahifalari uchun). */
  showToday?: boolean;
}

export default function PeriodFilter({ value, onChange, showToday = true }: Props) {
  const months = monthOptions(12);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Calendar size={15} style={{ color: '#4A5C50' }} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: 9,
          border: '1px solid #1E2E24',
          backgroundColor: '#0A0F0D',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {showToday && <option value="today">Bugun</option>}
        {months.map((m, i) => (
          <option key={m.key} value={m.key}>{m.label}{i === 0 ? ' (shu oy)' : ''}</option>
        ))}
        <option value="all">Hammasi</option>
      </select>
    </div>
  );
}
