'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import {
  FileText, RefreshCw, Download, CalendarClock, ArrowLeftRight,
  AlertTriangle, Building2, Wallet,
} from 'lucide-react';
import type { HisobotZayavka, TurizmHisobot } from '@/types/avia';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = (n: number) => Math.round(n || 0).toLocaleString('en-US').replaceAll(',', ' ');

const C = {
  card: '#141F19', line: '#1E2E24', mut: '#8A9A8F', dim: '#4A5C50',
  teal: '#22C7A9', green: '#7CFF4F', red: '#FF4444', orange: '#F5A623', blue: '#2CA5E0',
};

const th: React.CSSProperties = { padding: '9px 10px', textAlign: 'left', color: C.mut, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', borderBottom: `2px solid ${C.line}`, position: 'sticky', top: 0, backgroundColor: C.card };
const td: React.CSSProperties = { padding: '8px 10px', fontSize: 12.5, borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap' };
const mono = 'var(--font-geist-mono)';

// Zayavka holatini rangli belgilash (В работе default)
const payColor = (id: number) => (id === 3 ? C.green : id === 2 ? C.orange : C.red);

interface Col {
  h: string;
  right?: boolean;
  cell: (r: HisobotZayavka) => React.ReactNode;
}

export default function TurizmHisobotPage() {
  const { data: auth } = useSWR<{ user?: { role?: string } }>('/api/avia/auth', fetcher, { revalidateOnFocus: false });
  const role = auth?.user?.role;
  const canUse = role === 'admin' || role === 'sardor';

  const { data, error, isLoading, mutate } = useSWR<TurizmHisobot & { error?: string }>(
    '/api/avia/turizm/hisobot', fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  const [minMln, setMinMln] = useState(1); // qarz sektsiyalarida minimal summa (mln so'm)
  const [busy, setBusy] = useState(false);
  const min = minMln * 1_000_000;

  const refresh = async () => {
    setBusy(true);
    try { await mutate(fetcher('/api/avia/turizm/hisobot?refresh=1'), { revalidate: false }); }
    finally { setBusy(false); }
  };

  const mijozQarz = useMemo(() => (data?.mijozQarz ?? []).filter((r) => r.clientDebt >= min), [data, min]);
  const partnyorQarz = useMemo(() => (data?.partnyorQarz ?? []).filter((r) => r.partnerDebt >= min), [data, min]);

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const sheet = (rows: Record<string, unknown>[], name: string) =>
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
    sheet(data.kutilayotgan.map((r) => ({
      Zayavka: r.id, Mijoz: r.client, 'Xizmat sanasi': r.dateBegin, Menejer: r.manager,
      Sotuv: r.sell, "To'langan": r.clientPaid, Qoldiq: r.clientDebt, Holat: r.status, "To'lov": r.payStatus,
    })), 'Kutilayotgan');
    sheet(data.otkazilmagan.map((r) => ({
      Zayavka: r.id, Mijoz: r.client, 'Xizmat sanasi': r.dateBegin, Partnyor: r.supplierName,
      Netto: r.netto, "Mijoz to'lagan": r.clientPaid, Holat: r.status,
    })), "Partnyorga o'tkazilmagan");
    sheet(mijozQarz.map((r) => ({
      Zayavka: r.id, Mijoz: r.client, 'Xizmat sanasi': r.dateBegin, Sotuv: r.sell,
      "To'langan": r.clientPaid, QARZ: r.clientDebt, Menejer: r.manager, Holat: r.status,
    })), 'Mijoz qarz');
    sheet(partnyorQarz.map((r) => ({
      Zayavka: r.id, Partnyor: r.supplierName, Mijoz: r.client, 'Xizmat sanasi': r.dateBegin,
      Netto: r.netto, "To'langan": r.partnerPaid, QARZ: r.partnerDebt,
    })), 'Partnyor qarz');
    XLSX.writeFile(wb, `turizm-hisobot-${data.today}.xlsx`);
  };

  if (auth && !canUse) {
    return <div style={{ color: C.mut, padding: 30 }}>Bu bo‘lim uchun ruxsat yo‘q.</div>;
  }

  const zNum = (r: HisobotZayavka) => <span style={{ fontFamily: mono, color: '#fff' }}>{r.id}</span>;
  const date = (r: HisobotZayavka) => <span style={{ fontFamily: mono, color: C.mut }}>{r.dateBegin || '—'}</span>;
  const money = (n: number, col = '#e6f0ea') => <span style={{ fontFamily: mono, color: col }}>{fmt(n)}</span>;

  return (
    <div>
      {/* Sarlavha */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={24} style={{ color: C.teal }} /> Turizm hisobotlari
          </h1>
          <div style={{ color: C.dim, fontSize: 12, marginTop: 5 }}>
            U-ON’dan jonli · qamrov: {data?.sinceDate ?? '…'} dan bugungacha + kelajak
            {data?.generatedAt && <> · yangilangan {new Date(data.generatedAt).toLocaleTimeString('ru-RU').slice(0, 5)}</>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={refresh} disabled={busy}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, border: `1px solid ${C.line}`, backgroundColor: C.card, color: busy ? C.dim : C.mut, fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}>
            <RefreshCw size={15} style={{ animation: busy ? 'spin 1s linear infinite' : undefined }} /> {busy ? 'Yangilanmoqda…' : 'Yangilash'}
          </button>
          <button onClick={exportExcel} disabled={!data}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, border: `1px solid ${C.green}40`, backgroundColor: C.green + '14', color: C.green, fontSize: 13, fontWeight: 600, cursor: data ? 'pointer' : 'default', opacity: data ? 1 : 0.5 }}>
            <Download size={15} /> Excel
          </button>
        </div>
      </div>

      {error || data?.error ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: C.red + '14', border: `1px solid ${C.red}40`, color: C.red, borderRadius: 10, padding: '12px 16px', fontSize: 13 }}>
          <AlertTriangle size={16} /> {data?.error || "U-ON bilan bog'lanib bo'lmadi. Keyinroq urinib ko'ring."}
        </div>
      ) : isLoading || !data ? (
        <div style={{ color: C.mut, padding: 30, textAlign: 'center', backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12 }}>
          Yuklanmoqda… U-ON’dan zayavkalar olinmoqda (bir necha soniya).
        </div>
      ) : (
        <>
          {/* KPI */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Kpi icon={<CalendarClock size={18} />} label="Kutilayotgan zayavka" value={String(data.kpi.kutilayotganSoni)} color={C.blue} />
            <Kpi icon={<ArrowLeftRight size={18} />} label="Partnyorga o'tkazilmagan" value={String(data.kpi.otkazilmaganSoni)} color={C.orange} />
            <Kpi icon={<Wallet size={18} />} label="Mijoz qarzi" value={fmt(data.kpi.mijozQarzSumma)} sub={`${data.kpi.mijozQarzSoni} ta`} color={C.red} />
            <Kpi icon={<Building2 size={18} />} label="Partnyorga qarz" value={fmt(data.kpi.partnyorQarzSumma)} sub={`${data.kpi.partnyorQarzSoni} ta`} color={C.teal} />
          </div>

          {/* Qarz minimal summa filtri */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ color: C.mut, fontSize: 12.5 }}>Qarz sektsiyalarida minimal summa:</span>
            <input type="number" min={0} step={0.5} value={minMln}
              onChange={(e) => setMinMln(Math.max(0, Number(e.target.value) || 0))}
              style={{ width: 90, backgroundColor: '#0A0F0D', border: `1px solid ${C.line}`, color: '#fff', padding: '6px 9px', borderRadius: 8, fontSize: 13, textAlign: 'right', fontFamily: mono }} />
            <span style={{ color: C.dim, fontSize: 12.5 }}>mln so‘m (draft/mayda qarzlarni yashiradi)</span>
          </div>

          {/* A) Kutilayotgan */}
          <Section title="Kutilayotgan zayavkalar" subtitle="Xizmat/uchish sanasi hali kelmagan" icon={<CalendarClock size={18} />} color={C.blue} count={data.kutilayotgan.length}
            cols={[
              { h: 'Zayavka', cell: zNum },
              { h: 'Mijoz', cell: (r) => <span style={{ color: '#e6f0ea' }}>{r.client}</span> },
              { h: 'Xizmat sanasi', cell: date },
              { h: 'Menejer', cell: (r) => <span style={{ color: C.mut }}>{r.manager || '—'}</span> },
              { h: 'Sotuv', right: true, cell: (r) => money(r.sell) },
              { h: "To'langan", right: true, cell: (r) => money(r.clientPaid, C.green) },
              { h: 'Qoldiq', right: true, cell: (r) => money(r.clientDebt, r.clientDebt > 0 ? C.orange : C.dim) },
              { h: "To'lov", cell: (r) => <span style={{ color: payColor(r.payStatusId) }}>{r.payStatus || '—'}</span> },
            ]}
            rows={data.kutilayotgan} />

          {/* B) Partnyorga o'tkazilmagan */}
          <Section title="Partnyorga o'tkazilmagan to'lovlar" subtitle="Mijoz to'lagan, lekin partnyorga hali o'tkazilmagan" icon={<ArrowLeftRight size={18} />} color={C.orange} count={data.otkazilmagan.length}
            cols={[
              { h: 'Zayavka', cell: zNum },
              { h: 'Mijoz', cell: (r) => <span style={{ color: '#e6f0ea' }}>{r.client}</span> },
              { h: 'Xizmat sanasi', cell: date },
              { h: 'Partnyor', cell: (r) => <span style={{ color: C.mut }}>{r.supplierName || '—'}</span> },
              { h: 'Netto (partnyor)', right: true, cell: (r) => money(r.netto, C.orange) },
              { h: "Mijoz to'lagan", right: true, cell: (r) => money(r.clientPaid, C.green) },
              { h: 'Holat', cell: (r) => <span style={{ color: C.dim }}>{r.status}</span> },
            ]}
            rows={data.otkazilmagan} />

          {/* C1) Mijoz bizga qarz */}
          <Section title="Qarzdorlar — mijoz bizga qarz" subtitle="Xizmat sanasi o'tgan, mijoz to'liq to'lamagan" icon={<Wallet size={18} />} color={C.red} count={mijozQarz.length}
            total={mijozQarz.reduce((s, r) => s + r.clientDebt, 0)}
            cols={[
              { h: 'Zayavka', cell: zNum },
              { h: 'Mijoz', cell: (r) => <span style={{ color: '#e6f0ea' }}>{r.client}</span> },
              { h: 'Xizmat sanasi', cell: date },
              { h: 'Sotuv', right: true, cell: (r) => money(r.sell) },
              { h: "To'langan", right: true, cell: (r) => money(r.clientPaid, C.green) },
              { h: 'QARZ', right: true, cell: (r) => <b style={{ fontFamily: mono, color: C.red }}>{fmt(r.clientDebt)}</b> },
              { h: 'Menejer', cell: (r) => <span style={{ color: C.mut }}>{r.manager || '—'}</span> },
              { h: "To'lov", cell: (r) => <span style={{ color: payColor(r.payStatusId) }}>{r.payStatus || '—'}</span> },
            ]}
            rows={mijozQarz} />

          {/* C2) Biz partnyorga qarz */}
          <Section title="Qarzdorlar — biz partnyorga qarz" subtitle="Partnyor tannarxidan kam to'langan" icon={<Building2 size={18} />} color={C.teal} count={partnyorQarz.length}
            total={partnyorQarz.reduce((s, r) => s + r.partnerDebt, 0)}
            cols={[
              { h: 'Zayavka', cell: zNum },
              { h: 'Partnyor', cell: (r) => <span style={{ color: '#e6f0ea' }}>{r.supplierName || '—'}</span> },
              { h: 'Mijoz', cell: (r) => <span style={{ color: C.mut }}>{r.client}</span> },
              { h: 'Xizmat sanasi', cell: date },
              { h: 'Netto', right: true, cell: (r) => money(r.netto) },
              { h: "To'langan", right: true, cell: (r) => money(r.partnerPaid, C.green) },
              { h: 'QARZ', right: true, cell: (r) => <b style={{ fontFamily: mono, color: C.teal }}>{fmt(r.partnerDebt)}</b> },
            ]}
            rows={partnyorQarz} />
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Section({ title, subtitle, icon, color, count, total, cols, rows }: {
  title: string; subtitle: string; icon: React.ReactNode; color: string; count: number;
  total?: number; cols: Col[]; rows: HisobotZayavka[];
}) {
  return (
    <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: color + '18', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{title} <span style={{ color, fontSize: 13 }}>· {count}</span></div>
          <div style={{ color: C.dim, fontSize: 11.5 }}>{subtitle}</div>
        </div>
        {total !== undefined && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ color, fontSize: 17, fontWeight: 800, fontFamily: mono }}>{fmt(total)}</div>
            <div style={{ color: C.dim, fontSize: 10.5 }}>jami qarz, so‘m</div>
          </div>
        )}
      </div>
      <div style={{ maxHeight: '52vh', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead>
            <tr>{cols.map((c) => <th key={c.h} style={{ ...th, textAlign: c.right ? 'right' : 'left' }}>{c.h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>{cols.map((c) => <td key={c.h} style={{ ...td, textAlign: c.right ? 'right' : 'left' }}>{c.cell(r)}</td>)}</tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={cols.length} style={{ ...td, textAlign: 'center', color: C.dim, padding: 26 }}>Yozuv yo‘q</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 200px' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: color + '18', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, lineHeight: 1.1, fontFamily: mono }}>{value}</div>
        <div style={{ color: C.mut, fontSize: 11, marginTop: 2 }}>{label}{sub && <span style={{ color: C.dim }}> · {sub}</span>}</div>
      </div>
    </div>
  );
}
