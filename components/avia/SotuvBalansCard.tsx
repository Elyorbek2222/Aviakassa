'use client';

import useSWR from 'swr';
import { Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { periodQuery, periodLabel } from '@/lib/period';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DebtRow { qarz: number }

// Opshiy biletlar balansi: davr uchun jami yozildi (sotuv) ↔ kirdi (to'landi) ↔
// qoldiq qarz. Kassir ham, kassir-agent (Begzod) ham bir xil ko'radi — shuning
// uchun agent bo'yicha filtrlamaymiz (barcha biletlar). Balans faqat bilet raqami
// bilan kiritilgan to'lovlarni hisoblaydi (reports.debts = sotuv − shu to'lovlar).
export default function SotuvBalansCard({ period }: { period: string }) {
  const { data } = useSWR(`/api/avia/reports${periodQuery(period)}`, fetcher, { refreshInterval: 60000 });

  const yozildi: number = data?.kpi?.jamiSotuv ?? 0;
  const qarz: number = (data?.debts ?? []).reduce((s: number, d: DebtRow) => s + d.qarz, 0);
  const kirdi = yozildi - qarz;
  const hasDebt = qarz > 0;
  const accent = hasDebt ? '#FF5C5C' : '#7CFF4F';

  const col = (label: string, value: string, color: string, big = false): React.ReactNode => (
    <div>
      <div style={{ color: '#4A5C50', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: big ? 34 : 20, fontWeight: big ? 800 : 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: big ? '-0.5px' : undefined }}>
        {value}
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderTop: `2px solid ${accent}`, borderRadius: 14, padding: 20, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8A9A8F', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 16 }}>
        <Wallet size={15} style={{ color: accent }} /> BILETLAR BALANSI · {periodLabel(period).toUpperCase()}
        {data && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, backgroundColor: accent + '18', color: accent }}>
            {hasDebt ? <><AlertTriangle size={12} /> Qarz bor</> : <><CheckCircle2 size={12} /> To&apos;liq to&apos;landi</>}
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, alignItems: 'end' }}>
        {col('YOZILDI (SOTUV)', formatMoney(yozildi), '#fff')}
        {col('KIRDI (TO’LANDI)', formatMoney(kirdi), '#7CFF4F')}
        {col('BALANS (QARZ)', formatMoney(qarz), accent, true)}
      </div>
      {!data && <div style={{ color: '#4A5C50', fontSize: 11, marginTop: 10 }}>Yuklanmoqda…</div>}
    </div>
  );
}
