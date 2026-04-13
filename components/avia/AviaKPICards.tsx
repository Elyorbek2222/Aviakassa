'use client';

import { Plane, TrendingUp, Wallet, AlertTriangle, DollarSign } from 'lucide-react';
import type { AviaKPI } from '@/types/avia';
import { formatMoney } from '@/lib/utils';

interface Props {
  kpi: AviaKPI;
}

interface KPICardDef {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}

export default function AviaKPICards({ kpi }: Props) {
  const cards: KPICardDef[] = [
    {
      label: 'Jami biletlar',
      value: String(kpi.jamiBiletlar),
      sub: `Bugun: ${kpi.bugunBiletlar}`,
      icon: <Plane size={22} />,
      color: '#7CFF4F',
    },
    {
      label: 'Jami sotuv',
      value: formatMoney(kpi.jamiSotuv),
      icon: <TrendingUp size={22} />,
      color: '#2CA5E0',
    },
    {
      label: 'Stok / Kassa',
      value: formatMoney(kpi.stok),
      sub: `Naqd: ${formatMoney(kpi.naqd)} | Plastik: ${formatMoney(kpi.plastik)} | Per: ${formatMoney(kpi.perechisleniya)}`,
      icon: <Wallet size={22} />,
      color: '#F5A623',
    },
    {
      label: 'Partnyorlar qarzi',
      value: formatMoney(kpi.jamiQarzdorlik),
      icon: <AlertTriangle size={22} />,
      color: kpi.jamiQarzdorlik > 0 ? '#FF4444' : '#7CFF4F',
    },
    {
      label: 'Sof foyda',
      value: formatMoney(kpi.sofFoyda),
      icon: <DollarSign size={22} />,
      color: '#7CFF4F',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
      }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            backgroundColor: '#141F19',
            border: '1px solid #1E2E24',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <span style={{ color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>{card.label}</span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: card.color + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.color,
              }}
            >
              {card.icon}
            </div>
          </div>
          <div style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            {card.value}
          </div>
          {card.sub && (
            <div style={{ color: '#4A5C50', fontSize: 12 }}>{card.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
