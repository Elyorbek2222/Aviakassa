'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ListChecks, CheckCircle2, AlertTriangle, X, Plane, Wallet, Pencil } from 'lucide-react';
import { formatMoney, todayStr } from '@/lib/utils';
import type { AviaTicket } from '@/types/avia';
import EditTicketModal from '@/components/avia/EditTicketModal';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DebtRow {
  biletRaqam: string;
  qarz: number;
  tolangan: number;
}

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

  const qs = [isAdmin ? '' : `agent=${agentEnc}`, from ? `from=${from}` : '', to ? `to=${to}` : ''].filter(Boolean).join('&');
  const suffix = qs ? `?${qs}` : '';
  const { data: ticketsData, mutate: mutateTickets } = useSWR(`/api/avia/tickets${suffix}`, fetcher, { refreshInterval: 60000 });
  const { data: reportsData, mutate: mutateReports } = useSWR(`/api/avia/reports${suffix}`, fetcher, { refreshInterval: 60000 });

  const tickets: AviaTicket[] = ticketsData?.tickets || [];
  const debts: DebtRow[] = reportsData?.debts || [];
  const debtMap = new Map<string, DebtRow>();
  for (const d of debts) debtMap.set(d.biletRaqam, d);

  // Ikkala manba (biletlar + qarz/holat) yuklanmaguncha status chaqnamasin
  const loading = !ticketsData || !reportsData;

  // Eng yangisi tepada
  const rows = tickets.slice().sort((a, b) => (a.sana < b.sana ? 1 : a.sana > b.sana ? -1 : 0));

  const jamiSotuv = tickets.reduce((s, t) => s + t.sotishNarxi, 0);
  const jamiQarz = debts.reduce((s, d) => s + d.qarz, 0);
  const qarzli = debts.length;
  const yopilgan = Math.max(0, tickets.length - qarzli);

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

  return (
    <div>
      <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
        <ListChecks size={24} style={{ color: '#F5A623' }} />
        Biletlar ro&apos;yxati
      </h1>
      <div style={{ color: '#4A5C50', fontSize: 12, marginBottom: 20 }}>Sana oralig&apos;ini tanlab, barcha biletlar holatini ko&apos;ring</div>

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

      {loading ? (
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
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #1E2E24' }}>
                      <td style={{ padding: '10px 12px', color: '#8A9A8F', fontSize: 12 }}>{t.sana}</td>
                      <td style={{ padding: '10px 12px', color: '#fff', fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>{t.biletRaqam}</td>
                      <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{t.yolovchi}</td>
                      <td style={{ padding: '10px 12px', color: '#8A9A8F', fontSize: 12 }}>{t.airlineName}</td>
                      <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13, textAlign: 'right' }}>{formatMoney(t.sotishNarxi)}</td>
                      <td style={{ padding: '10px 12px', color: '#7CFF4F', fontSize: 13, textAlign: 'right' }}>{formatMoney(tolangan)}</td>
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
