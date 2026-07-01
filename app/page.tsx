'use client';

import useSWR from 'swr';
import { BarChart3, Plane, TrendingUp, Wallet, AlertTriangle, DollarSign, Sparkles } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import type { AviaKPI, AviaSalesPoint, AirlineStat, DebtRecord, PartnerDebt } from '@/types/avia';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useState } from 'react';
import PeriodFilter from '@/components/avia/PeriodFilter';
import AviaMonthlyChart from '@/components/avia/AviaMonthlyChart';
import { periodQuery, currentMonthKey, periodLabel } from '@/lib/period';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function KPICard({
  label,
  value,
  icon,
  color = '#7CFF4F',
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
  sub?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#141F19',
        border: `1px solid ${hovered ? color + '50' : '#1E2E24'}`,
        borderRadius: 14,
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? `0 8px 24px rgba(0,0,0,0.25), 0 0 0 1px ${color}20` : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${color}60, transparent)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
          borderRadius: '14px 14px 0 0',
        }}
      />

      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `radial-gradient(circle at 30% 30%, ${color}25, ${color}08)`,
          border: `1px solid ${color}25`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ color: '#8A9A8F', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', marginBottom: 4 }}>
          {label}
        </div>
        <div
          style={{
            color: '#fff',
            fontSize: 20,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.2,
          }}
        >
          {value}
        </div>
        {sub && (
          <div style={{ color: '#4A5C50', fontSize: 11, marginTop: 3 }}>{sub}</div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.2px' }}>
        {title}
      </h3>
      {subtitle && (
        <span style={{ color: '#4A5C50', fontSize: 11, fontWeight: 500 }}>{subtitle}</span>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState(currentMonthKey());
  const { data, error, isLoading } = useSWR(`/api/avia/reports${periodQuery(period)}`, fetcher, {
    refreshInterval: 30000,
  });
  // Oyma-oy infografika uchun butun davr (period'dan mustaqil)
  const { data: allTimeData } = useSWR('/api/avia/reports', fetcher, { refreshInterval: 60000 });

  const [partnerRowHover, setPartnerRowHover] = useState<string | null>(null);
  const [debtRowHover, setDebtRowHover] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, gap: 12 }}>
        <div
          style={{
            width: 20,
            height: 20,
            border: '2px solid #1E2E24',
            borderTopColor: '#7CFF4F',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <span style={{ color: '#4A5C50', fontSize: 14 }}>Yuklanmoqda...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ color: '#FF3B30', padding: 40, textAlign: 'center' }}>
        Ma&apos;lumotlarni yuklashda xatolik
      </div>
    );
  }

  const kpi: AviaKPI = data.kpi;
  const salesTrend: AviaSalesPoint[] = data.salesTrend || [];
  const airlineStats: AirlineStat[] = data.airlineStats || [];
  const debts: DebtRecord[] = data.debts || [];
  const partnerDebts: PartnerDebt[] = data.partnerDebts || [];

  const now = new Date();
  const timeStr = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  const tableHeaderStyle: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    color: '#4A5C50',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderBottom: '1px solid #1E2E24',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            Dashboard
          </h1>
          <div style={{ color: '#4A5C50', fontSize: 12, marginTop: 4 }}>Davr: {periodLabel(period)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <PeriodFilter value={period} onChange={setPeriod} showToday={false} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4A5C50', fontSize: 12 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#7CFF4F',
                boxShadow: '0 0 6px #7CFF4F',
              }}
            />
            Yangilangan: {timeStr}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <KPICard
          label="Jami Biletlar"
          value={String(kpi.jamiBiletlar)}
          icon={<Plane size={20} style={{ transform: 'rotate(-45deg)' }} />}
          sub="Barcha vaqt"
        />
        <KPICard
          label="Bugun"
          value={String(kpi.bugunBiletlar)}
          icon={<BarChart3 size={20} />}
          color="#2CA5E0"
          sub="Bugungi biletlar"
        />
        <KPICard
          label="Jami Sotuv"
          value={formatMoney(kpi.jamiSotuv)}
          icon={<TrendingUp size={20} />}
          sub="Umumiy savdo"
        />
        <KPICard
          label="Stok (Kassa)"
          value={formatMoney(kpi.stok)}
          icon={<Wallet size={20} />}
          color="#F5A623"
          sub="Kassadagi pul"
        />
        <KPICard
          label="Sof Foyda"
          value={formatMoney(kpi.sofFoyda)}
          icon={<DollarSign size={20} />}
          color="#7CFF4F"
          sub="Xarajatlar chegirilgan"
        />
        <KPICard
          label="Qarzdorlik"
          value={formatMoney(kpi.jamiQarzdorlik)}
          icon={<AlertTriangle size={20} />}
          color="#FF3B30"
          sub="Mijozlar qarzi"
        />
      </div>

      {/* Charts Row */}
      <div
        className="split-2"
        style={{ gap: 14, marginBottom: 24 }}
      >
        {/* Sales Trend Chart */}
        <div
          style={{
            backgroundColor: '#141F19',
            border: '1px solid #1E2E24',
            borderRadius: 14,
            padding: '20px 20px 16px',
            borderTop: '2px solid #7CFF4F40',
          }}
        >
          <SectionHeader title="Sotuv Trendi" subtitle={`${salesTrend.length} kun`} />
          {salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="sotuvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7CFF4F" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#7CFF4F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2E2480" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#1E2E24"
                  tick={{ fill: '#4A5C50', fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#1E2E24"
                  tick={{ fill: '#4A5C50', fontSize: 11 }}
                  tickFormatter={formatMoney}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141F19',
                    border: '1px solid #1E2E24',
                    borderRadius: 10,
                    color: '#fff',
                    fontSize: 13,
                    backdropFilter: 'blur(8px)',
                  }}
                  formatter={(value) => [formatMoney(Number(value)), 'Sotuv']}
                  labelStyle={{ color: '#8A9A8F', marginBottom: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="sotuv"
                  stroke="#7CFF4F"
                  fill="url(#sotuvGrad)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#7CFF4F', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: '#4A5C50', textAlign: 'center', padding: 40, fontSize: 13 }}>
              Ma&apos;lumot yo&apos;q
            </div>
          )}
        </div>

        {/* Airline Stats Chart */}
        <div
          style={{
            backgroundColor: '#141F19',
            border: '1px solid #1E2E24',
            borderRadius: 14,
            padding: '20px 20px 16px',
            borderTop: '2px solid #2CA5E040',
          }}
        >
          <SectionHeader title="Aviakompaniyalar" />
          {airlineStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={airlineStats} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2E2480" vertical={false} />
                <XAxis
                  dataKey="airline"
                  stroke="#1E2E24"
                  tick={{ fill: '#4A5C50', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#1E2E24"
                  tick={{ fill: '#4A5C50', fontSize: 11 }}
                  tickFormatter={formatMoney}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141F19',
                    border: '1px solid #1E2E24',
                    borderRadius: 10,
                    color: '#fff',
                    fontSize: 13,
                  }}
                  formatter={(value) => [formatMoney(Number(value))]}
                  labelStyle={{ color: '#8A9A8F', marginBottom: 4 }}
                />
                <Bar dataKey="sotuv" fill="#7CFF4F" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="foyda" fill="#2CA5E0" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: '#4A5C50', textAlign: 'center', padding: 40, fontSize: 13 }}>
              Ma&apos;lumot yo&apos;q
            </div>
          )}
        </div>
      </div>

      {/* Oyma-oy infografika */}
      <div style={{ marginBottom: 14 }}>
        <AviaMonthlyChart data={allTimeData?.salesTrend || []} />
      </div>

      {/* Partner Debts */}
      {partnerDebts.length > 0 && (
        <div
          style={{
            backgroundColor: '#141F19',
            border: '1px solid #1E2E24',
            borderRadius: 14,
            padding: '20px',
            marginBottom: 14,
            overflow: 'hidden',
          }}
        >
          <SectionHeader title="Partnyorlar Qarzdorligi" subtitle={`${partnerDebts.length} ta`} />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Aviakompaniya</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Biletlar</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Tarif Summa</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Inkassatsiya</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Qarz</th>
              </tr>
            </thead>
            <tbody>
              {partnerDebts.map((d) => (
                <tr
                  key={d.airline}
                  onMouseEnter={() => setPartnerRowHover(d.airline)}
                  onMouseLeave={() => setPartnerRowHover(null)}
                  style={{
                    borderBottom: '1px solid #1E2E24',
                    backgroundColor: partnerRowHover === d.airline ? '#1E2E2460' : 'transparent',
                    transition: 'background-color 0.1s ease',
                  }}
                >
                  <td style={{ padding: '11px 14px', color: '#fff', fontSize: 13, fontWeight: 500 }}>
                    {d.airline}
                  </td>
                  <td style={{ padding: '11px 14px', color: '#8A9A8F', fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {d.biletlar}
                  </td>
                  <td style={{ padding: '11px 14px', color: '#fff', fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(d.biletlarSumma)}
                  </td>
                  <td style={{ padding: '11px 14px', color: '#7CFF4F', fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(d.inkassatsiya)}
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      {d.qarz > 0 && (
                        <div
                          style={{
                            height: 4,
                            width: 48,
                            borderRadius: 2,
                            backgroundColor: '#1E2E24',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, (d.qarz / d.biletlarSumma) * 100)}%`,
                              backgroundColor: '#FF3B30',
                              borderRadius: 2,
                            }}
                          />
                        </div>
                      )}
                      <span
                        style={{
                          color: d.qarz > 0 ? '#FF3B30' : '#7CFF4F',
                          fontSize: 13,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          minWidth: 80,
                          textAlign: 'right',
                        }}
                      >
                        {formatMoney(d.qarz)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Debts */}
      {debts.length > 0 && (
        <div
          style={{
            backgroundColor: '#141F19',
            border: '1px solid #1E2E24',
            borderRadius: 14,
            padding: '20px',
            overflow: 'hidden',
          }}
        >
          <SectionHeader
            title="Mijozlar Qarzdorligi"
            subtitle={debts.length > 20 ? `${debts.length} tadan 20 ta` : `${debts.length} ta`}
          />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Bilet</th>
                <th style={tableHeaderStyle}>Mijoz</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Narxi</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>To&apos;langan</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Qarz</th>
              </tr>
            </thead>
            <tbody>
              {debts.slice(0, 20).map((d) => (
                <tr
                  key={d.biletId}
                  onMouseEnter={() => setDebtRowHover(d.biletId)}
                  onMouseLeave={() => setDebtRowHover(null)}
                  style={{
                    borderBottom: '1px solid #1E2E24',
                    backgroundColor: debtRowHover === d.biletId ? '#1E2E2460' : 'transparent',
                    transition: 'background-color 0.1s ease',
                  }}
                >
                  <td style={{ padding: '11px 14px', color: '#8A9A8F', fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>
                    {d.biletRaqam}
                  </td>
                  <td style={{ padding: '11px 14px', color: '#fff', fontSize: 13, fontWeight: 500 }}>
                    {d.mijozIsmi}
                  </td>
                  <td style={{ padding: '11px 14px', color: '#8A9A8F', fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(d.sotishNarxi)}
                  </td>
                  <td style={{ padding: '11px 14px', color: '#7CFF4F', fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(d.tolangan)}
                  </td>
                  <td style={{ padding: '11px 14px', color: '#FF3B30', fontSize: 13, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(d.qarz)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
