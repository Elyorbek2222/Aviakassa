'use client';

import useSWR from 'swr';
import { BarChart3, Plane, TrendingUp, Wallet, AlertTriangle, DollarSign } from 'lucide-react';
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function KPICard({
  label,
  value,
  icon,
  color = '#7CFF4F',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: '#141F19',
        border: '1px solid #1E2E24',
        borderRadius: 12,
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: color + '15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ color: '#8A9A8F', fontSize: 13 }}>{label}</div>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data, error, isLoading } = useSWR('/api/avia/reports', fetcher, {
    refreshInterval: 30000,
  });

  if (isLoading) {
    return (
      <div style={{ color: '#8A9A8F', padding: 40, textAlign: 'center' }}>
        Yuklanmoqda...
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

  return (
    <div>
      <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        Avia Kassa Dashboard
      </h1>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KPICard
          label="Jami Biletlar"
          value={String(kpi.jamiBiletlar)}
          icon={<Plane size={22} />}
        />
        <KPICard
          label="Bugun"
          value={String(kpi.bugunBiletlar)}
          icon={<BarChart3 size={22} />}
          color="#2CA5E0"
        />
        <KPICard
          label="Jami Sotuv"
          value={formatMoney(kpi.jamiSotuv)}
          icon={<TrendingUp size={22} />}
        />
        <KPICard
          label="Stok (Kassa)"
          value={formatMoney(kpi.stok)}
          icon={<Wallet size={22} />}
          color="#F5A623"
        />
        <KPICard
          label="Sof Foyda"
          value={formatMoney(kpi.sofFoyda)}
          icon={<DollarSign size={22} />}
          color="#7CFF4F"
        />
        <KPICard
          label="Qarzdorlik"
          value={formatMoney(kpi.jamiQarzdorlik)}
          icon={<AlertTriangle size={22} />}
          color="#FF3B30"
        />
      </div>

      {/* Charts Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Sales Trend Chart */}
        <div
          style={{
            backgroundColor: '#141F19',
            border: '1px solid #1E2E24',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Sotuv Trendi
          </h3>
          {salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2E24" />
                <XAxis
                  dataKey="date"
                  stroke="#4A5C50"
                  fontSize={12}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis stroke="#4A5C50" fontSize={12} tickFormatter={formatMoney} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141F19',
                    border: '1px solid #1E2E24',
                    borderRadius: 8,
                    color: '#fff',
                  }}
                  formatter={(value) => [formatMoney(Number(value)), 'Sotuv']}
                />
                <Area
                  type="monotone"
                  dataKey="sotuv"
                  stroke="#7CFF4F"
                  fill="#7CFF4F20"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: '#4A5C50', textAlign: 'center', padding: 40 }}>
              Ma&apos;lumot yo&apos;q
            </div>
          )}
        </div>

        {/* Airline Stats Chart */}
        <div
          style={{
            backgroundColor: '#141F19',
            border: '1px solid #1E2E24',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Aviakompaniyalar
          </h3>
          {airlineStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={airlineStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2E24" />
                <XAxis dataKey="airline" stroke="#4A5C50" fontSize={11} />
                <YAxis stroke="#4A5C50" fontSize={12} tickFormatter={formatMoney} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141F19',
                    border: '1px solid #1E2E24',
                    borderRadius: 8,
                    color: '#fff',
                  }}
                  formatter={(value) => [formatMoney(Number(value))]}
                />
                <Bar dataKey="sotuv" fill="#7CFF4F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="foyda" fill="#2CA5E0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: '#4A5C50', textAlign: 'center', padding: 40 }}>
              Ma&apos;lumot yo&apos;q
            </div>
          )}
        </div>
      </div>

      {/* Partner Debts */}
      {partnerDebts.length > 0 && (
        <div
          style={{
            backgroundColor: '#141F19',
            border: '1px solid #1E2E24',
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Partnyorlar Qarzdorligi
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>Aviakompaniya</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>Biletlar</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>Tarif Summa</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>Inkassatsiya</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>Qarz</th>
              </tr>
            </thead>
            <tbody>
              {partnerDebts.map((d) => (
                <tr key={d.airline} style={{ borderBottom: '1px solid #1E2E24' }}>
                  <td style={{ padding: '10px 12px', color: '#fff', fontSize: 14 }}>{d.airline}</td>
                  <td style={{ padding: '10px 12px', color: '#fff', fontSize: 14, textAlign: 'right' }}>{d.biletlar}</td>
                  <td style={{ padding: '10px 12px', color: '#fff', fontSize: 14, textAlign: 'right' }}>{formatMoney(d.biletlarSumma)}</td>
                  <td style={{ padding: '10px 12px', color: '#7CFF4F', fontSize: 14, textAlign: 'right' }}>{formatMoney(d.inkassatsiya)}</td>
                  <td style={{ padding: '10px 12px', color: d.qarz > 0 ? '#FF3B30' : '#7CFF4F', fontSize: 14, textAlign: 'right', fontWeight: 600 }}>
                    {formatMoney(d.qarz)}
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
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Mijozlar Qarzdorligi
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>Bilet</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>Mijoz</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>Narxi</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>To&apos;langan</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: '#8A9A8F', fontSize: 13, fontWeight: 500 }}>Qarz</th>
              </tr>
            </thead>
            <tbody>
              {debts.slice(0, 20).map((d) => (
                <tr key={d.biletId} style={{ borderBottom: '1px solid #1E2E24' }}>
                  <td style={{ padding: '10px 12px', color: '#fff', fontSize: 14 }}>{d.biletRaqam}</td>
                  <td style={{ padding: '10px 12px', color: '#fff', fontSize: 14 }}>{d.mijozIsmi}</td>
                  <td style={{ padding: '10px 12px', color: '#fff', fontSize: 14, textAlign: 'right' }}>{formatMoney(d.sotishNarxi)}</td>
                  <td style={{ padding: '10px 12px', color: '#7CFF4F', fontSize: 14, textAlign: 'right' }}>{formatMoney(d.tolangan)}</td>
                  <td style={{ padding: '10px 12px', color: '#FF3B30', fontSize: 14, textAlign: 'right', fontWeight: 600 }}>{formatMoney(d.qarz)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
