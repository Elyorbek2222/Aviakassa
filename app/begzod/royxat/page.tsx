'use client';

import { useState, Fragment } from 'react';
import useSWR from 'swr';
import { ListChecks, CheckCircle2, AlertTriangle, X, Plane, Wallet, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { formatMoney, todayStr } from '@/lib/utils';
import type { AviaTicket, AviaPayment } from '@/types/avia';
import EditTicketModal from '@/components/avia/EditTicketModal';
import AviaPaymentsTable from '@/components/avia/AviaPaymentsTable';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DebtRow {
  biletRaqam: string;
  qarz: number;
  tolangan: number;
}

// To'lov turi belgilari (naqd/plastik/perechisleniya) — AviaPaymentsTable bilan bir xil
const PAY_BADGE: Record<string, { label: string; color: string }> = {
  naqd: { label: 'Naqd', color: '#7CFF4F' },
  plastik: { label: 'Plastik', color: '#F5A623' },
  perechisleniya: { label: 'Perechisleniya', color: '#2CA5E0' },
};

const monthStart = () => todayStr().slice(0, 8) + '01';

export default function BegzodRoyxatPage() {
  const { data: authData } = useSWR('/api/avia/auth', fetcher);
  const agentName = authData?.user?.name || 'Kassir-Agent';
  const agentEnc = encodeURIComponent(agentName);
  // Admin — nazoratchi: hamma agentlarning biletlarini ko'radi va tahrirlaydi.
  // Aviakassir — faqat o'z biletlari (agent bo'yicha filtr).
  const isAdmin = authData?.user?.role === 'admin';

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [editing, setEditing] = useState<AviaTicket | null>(null);
  const [view, setView] = useState<'biletlar' | 'prixodlar'>('biletlar');

  const qs = [isAdmin ? '' : `agent=${agentEnc}`, from ? `from=${from}` : '', to ? `to=${to}` : ''].filter(Boolean).join('&');
  const suffix = qs ? `?${qs}` : '';
  const { data: ticketsData, mutate: mutateTickets } = useSWR(`/api/avia/tickets${suffix}`, fetcher, { refreshInterval: 60000, keepPreviousData: true });
  const { data: reportsData, mutate: mutateReports } = useSWR(`/api/avia/reports${suffix}`, fetcher, { refreshInterval: 60000, keepPreviousData: true });
  // To'lovlar (pul kirimlari) — sana bilan cheklamaymiz: bilet uchun keyin kirgan
  // pul ham ko'rinsin. Bilet raqami bo'yicha biriktiramiz.
  const { data: paymentsData } = useSWR('/api/avia/payments', fetcher, { refreshInterval: 60000 });

  const tickets: AviaTicket[] = ticketsData?.tickets || [];
  const debts: DebtRow[] = reportsData?.debts || [];
  const debtMap = new Map<string, DebtRow>();
  for (const d of debts) debtMap.set(d.biletRaqam, d);

  // Har bir bilet raqami uchun kirgan to'lovlar (eng yangisi tepada)
  const payments: AviaPayment[] = paymentsData?.payments || [];
  const payMap = new Map<string, AviaPayment[]>();
  for (const p of payments) {
    if (!p.biletRaqam) continue;
    const list = payMap.get(p.biletRaqam);
    if (list) list.push(p);
    else payMap.set(p.biletRaqam, [p]);
  }
  for (const list of payMap.values()) list.sort((a, b) => (a.sana < b.sana ? 1 : -1));

  // Qaysi biletlar yoyilgan (to'lovlari ko'rinadigan)
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const toggleRow = (id: string) =>
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Ikkala manba (biletlar + qarz/holat) yuklanmaguncha status chaqnamasin
  const loading = !ticketsData || !reportsData;

  // Eng yangisi tepada
  const rows = tickets.slice().sort((a, b) => (a.sana < b.sana ? 1 : a.sana > b.sana ? -1 : 0));

  const jamiSotuv = tickets.reduce((s, t) => s + t.sotishNarxi, 0);
  const jamiQarz = debts.reduce((s, d) => s + d.qarz, 0);
  const qarzli = debts.length;
  const yopilgan = Math.max(0, tickets.length - qarzli);

  // Prixodlar (kirgan pullar) — tanlangan sana oralig'idagi barcha to'lovlar
  const prixodlar = payments
    .filter((p) => (!from || p.sana >= from) && (!to || p.sana <= to))
    .slice()
    .sort((a, b) => (a.sana < b.sana ? 1 : -1));
  const jamiPrixod = prixodlar.reduce((s, p) => s + p.summa, 0);

  const inputStyle = {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #1E2E24',
    backgroundColor: '#0A0F0D', color: '#fff', fontSize: 14, outline: 'none',
  } as const;
  const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', color: '#8A9A8F', fontSize: 12, fontWeight: 500 };
  const badge: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 };

  const setThisMonth = () => { setFrom(monthStart()); setTo(todayStr()); };
  const setAll = () => { setFrom(''); setTo(''); };

  const kpiCard = (label: string, value: string, color: string, Icon: typeof Plane) => (
    <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon size={18} style={{ color, flexShrink: 0 }} />
      <div>
        <div style={{ color: '#8A9A8F', fontSize: 11 }}>{label}</div>
        <div style={{ color, fontSize: 18, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );

  const segBtn = (active: boolean, color: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, fontSize: 13.5,
    cursor: 'pointer', fontWeight: active ? 700 : 500,
    border: `1px solid ${active ? color : '#1E2E24'}`, backgroundColor: active ? color + '18' : '#141F19', color: active ? color : '#8A9A8F',
  });

  return (
    <div>
      <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
        <ListChecks size={24} style={{ color: '#F5A623' }} />
        Biletlar ro&apos;yxati
      </h1>
      <div style={{ color: '#4A5C50', fontSize: 12, marginBottom: 20 }}>Sana oralig&apos;ini tanlab, barcha biletlar holatini ko&apos;ring. Bilet uchun kirgan pullarni ko&apos;rish uchun &quot;To&apos;langan&quot; ustuniga bosing.</div>

      {/* Sana oralig'i: dan — gacha */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <label style={{ display: 'block', color: '#8A9A8F', fontSize: 12, marginBottom: 6 }}>Sanadan</label>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', color: '#8A9A8F', fontSize: 12, marginBottom: 6 }}>Sanagacha</label>
          <input type="date" value={to} min={from || undefined} max={todayStr()} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
        </div>
        <button type="button" onClick={setThisMonth} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #F5A62340', backgroundColor: '#F5A62314', color: '#F5A623', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Bu oy</button>
        <button type="button" onClick={setAll} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #1E2E24', backgroundColor: 'transparent', color: '#8A9A8F', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Hammasi</button>
      </div>

      {/* Ko'rinish: Biletlar | Prixodlar (kirgan pullar) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setView('biletlar')} style={segBtn(view === 'biletlar', '#F5A623')}>
          <ListChecks size={15} /> Biletlar
        </button>
        <button type="button" onClick={() => setView('prixodlar')} style={segBtn(view === 'prixodlar', '#2CA5E0')}>
          <Wallet size={15} /> Prixodlar
        </button>
      </div>

      {view === 'prixodlar' ? (
        !paymentsData ? (
          <div style={{ color: '#8A9A8F', textAlign: 'center', padding: 60, backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12 }}>Yuklanmoqda...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
              {kpiCard('Kirgan pullar (prixod)', formatMoney(jamiPrixod), '#2CA5E0', Wallet)}
              {kpiCard("To'lovlar soni", String(prixodlar.length), '#8A9A8F', ListChecks)}
            </div>
            {prixodlar.length === 0 ? (
              <div style={{ color: '#4A5C50', textAlign: 'center', padding: 40, fontSize: 14, backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12 }}>Bu oraliqda kirgan pul yo&apos;q</div>
            ) : (
              <AviaPaymentsTable payments={prixodlar} />
            )}
          </>
        )
      ) : loading ? (
        <div style={{ color: '#8A9A8F', textAlign: 'center', padding: 60, backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12 }}>Yuklanmoqda...</div>
      ) : (
      <>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
        {kpiCard('Jami biletlar', String(tickets.length), '#F5A623', Plane)}
        {kpiCard('Jami sotuv', formatMoney(jamiSotuv), '#7CFF4F', ListChecks)}
        {kpiCard("To'langan", String(yopilgan), '#7CFF4F', CheckCircle2)}
        {kpiCard('Jami qarz', formatMoney(jamiQarz), jamiQarz > 0 ? '#FF5C5C' : '#7CFF4F', Wallet)}
      </div>

      {/* Jadval */}
      <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 20 }}>
        {rows.length === 0 ? (
          <div style={{ color: '#4A5C50', textAlign: 'center', padding: 40, fontSize: 14 }}>Bu oraliqda bilet yo&apos;q</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                  <th style={th}>Sana</th>
                  <th style={th}>Bilet</th>
                  <th style={th}>Yo&apos;lovchi</th>
                  <th style={th}>Airline</th>
                  <th style={{ ...th, textAlign: 'right' }}>Sotish</th>
                  <th style={{ ...th, textAlign: 'right' }}>To&apos;langan</th>
                  <th style={{ ...th, textAlign: 'right' }}>Qarz</th>
                  <th style={{ ...th, textAlign: 'right' }}>Holat</th>
                  {isAdmin && <th style={{ ...th, textAlign: 'right' }}>Amal</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const d = debtMap.get(t.biletRaqam);
                  const qarz = d ? d.qarz : 0;
                  const tolangan = d ? d.tolangan : t.sotishNarxi;
                  const payList = payMap.get(t.biletRaqam) || [];
                  const open = openRows.has(t.id);
                  const colCount = isAdmin ? 9 : 8;
                  return (
                    <Fragment key={t.id}>
                    <tr style={{ borderBottom: open ? 'none' : '1px solid #1E2E24' }}>
                      <td style={{ padding: '10px 12px', color: '#8A9A8F', fontSize: 12 }}>{t.sana}</td>
                      <td style={{ padding: '10px 12px', color: '#fff', fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>{t.biletRaqam}</td>
                      <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{t.yolovchi}</td>
                      <td style={{ padding: '10px 12px', color: '#8A9A8F', fontSize: 12 }}>{t.airlineName}</td>
                      <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13, textAlign: 'right' }}>{formatMoney(t.sotishNarxi)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {payList.length > 0 ? (
                          <button onClick={() => toggleRow(t.id)} title="Kirgan to'lovlarni ko'rish"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto', padding: 0, border: 'none', background: 'none', color: '#7CFF4F', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            {formatMoney(tolangan)}
                            <span style={{ color: '#4A5C50', fontWeight: 500, fontSize: 11 }}>· {payList.length} to&apos;lov</span>
                          </button>
                        ) : (
                          <span style={{ color: '#7CFF4F', fontSize: 13 }}>{formatMoney(tolangan)}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: qarz > 0 ? '#FF5C5C' : '#4A5C50', fontSize: 13, textAlign: 'right', fontWeight: qarz > 0 ? 700 : 400 }}>{formatMoney(qarz)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {qarz <= 0 ? (
                          <span style={{ ...badge, backgroundColor: '#7CFF4F18', color: '#7CFF4F', border: '1px solid #7CFF4F30' }}>
                            <CheckCircle2 size={10} /> To&apos;landi
                          </span>
                        ) : tolangan > 0 ? (
                          <span style={{ ...badge, backgroundColor: '#F5A62318', color: '#F5A623', border: '1px solid #F5A62340' }}>
                            <AlertTriangle size={10} /> Qisman
                          </span>
                        ) : (
                          <span style={{ ...badge, backgroundColor: '#FF444418', color: '#FF4444', border: '1px solid #FF444430' }}>
                            <X size={10} /> To&apos;lanmadi
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button onClick={() => setEditing(t)} title="Biletni tahrirlash"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #F5A62340', backgroundColor: '#F5A62314', color: '#F5A623', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            <Pencil size={12} /> Tahrirlash
                          </button>
                        </td>
                      )}
                    </tr>
                    {open && payList.length > 0 && (
                      <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                        <td colSpan={colCount} style={{ padding: '0 12px 12px 12px', backgroundColor: '#0F1613' }}>
                          <div style={{ fontSize: 11, color: '#8A9A8F', padding: '10px 0 6px' }}>Kirgan to&apos;lovlar:</div>
                          {payList.map((p) => {
                            const meta = PAY_BADGE[p.tolovTuri] || { label: p.tolovTuri, color: '#8A9A8F' };
                            return (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid #16211B', fontSize: 12, flexWrap: 'wrap' }}>
                                <span style={{ color: '#8A9A8F', minWidth: 84 }}>{p.sana}</span>
                                <span style={{ color: '#fff', fontWeight: 700, minWidth: 120 }}>{formatMoney(p.summa)}</span>
                                <span style={{ padding: '2px 8px', borderRadius: 5, backgroundColor: meta.color + '20', color: meta.color, fontSize: 11, fontWeight: 600 }}>{meta.label}</span>
                                {p.izoh && <span style={{ color: '#4A5C50' }}>— {p.izoh}</span>}
                              </div>
                            );
                          })}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ color: '#4A5C50', fontSize: 12, marginTop: 12, textAlign: 'right' }}>
          Jami: {rows.length} ta bilet
        </div>
      </div>
      </>
      )}

      {editing && (
        <EditTicketModal
          ticket={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { mutateTickets(); mutateReports(); }}
        />
      )}
    </div>
  );
}
