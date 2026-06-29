'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plane, FileText, Wallet, CheckCircle2, AlertTriangle, Target } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { AIRLINE_LABELS, type AirlineKey } from '@/types/avia';
import PeriodFilter from '@/components/avia/PeriodFilter';
import { periodRange, periodLabel } from '@/lib/period';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function TicketForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    airline: 'uzairways' as AirlineKey,
    biletRaqam: '',
    yolovchi: '',
    passengerCount: 1,
    tarif: '',
    sotishNarxi: '',
    izoh: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/avia/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          airlineName: AIRLINE_LABELS[form.airline] || form.airline,
          tarif: Number(form.tarif),
          sotishNarxi: Number(form.sotishNarxi),
          izoh: form.izoh || undefined,
        }),
      });

      if (res.ok) {
        setMessage('Bilet saqlandi!');
        setForm({ airline: 'uzairways', biletRaqam: '', yolovchi: '', passengerCount: 1, tarif: '', sotishNarxi: '', izoh: '' });
        onSuccess();
      } else {
        setMessage('Xatolik yuz berdi');
      }
    } catch {
      setMessage('Serverga ulanib bo\'lmadi');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #1E2E24',
    backgroundColor: '#0A0F0D',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = { display: 'block', color: '#8A9A8F', fontSize: 13, marginBottom: 6 };

  return (
    <div
      style={{
        backgroundColor: '#141F19',
        border: '1px solid #1E2E24',
        borderRadius: 12,
        padding: 24,
      }}
    >
      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FileText size={20} style={{ color: '#7CFF4F' }} />
        Yangi Bilet
      </h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Aviakompaniya</label>
          <select
            value={form.airline}
            onChange={(e) => setForm({ ...form, airline: e.target.value as AirlineKey })}
            style={inputStyle}
          >
            {Object.entries(AIRLINE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Bilet Raqami</label>
          <input
            type="text"
            value={form.biletRaqam}
            onChange={(e) => setForm({ ...form, biletRaqam: e.target.value })}
            placeholder="001-1234567890"
            required
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Yo&apos;lovchi Ismi</label>
          <input
            type="text"
            value={form.yolovchi}
            onChange={(e) => setForm({ ...form, yolovchi: e.target.value })}
            placeholder="Familiya Ism"
            required
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Tarif (UZS)</label>
            <input
              type="number"
              value={form.tarif}
              onChange={(e) => setForm({ ...form, tarif: e.target.value })}
              placeholder="0"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Sotish Narxi (UZS)</label>
            <input
              type="number"
              value={form.sotishNarxi}
              onChange={(e) => setForm({ ...form, sotishNarxi: e.target.value })}
              placeholder="0"
              required
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Yo&apos;lovchilar soni</label>
          <input
            type="number"
            value={form.passengerCount}
            onChange={(e) => setForm({ ...form, passengerCount: Number(e.target.value) })}
            min={1}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Kommentariya</label>
          <textarea
            value={form.izoh}
            onChange={(e) => setForm({ ...form, izoh: e.target.value })}
            placeholder="Qo'shimcha izoh..."
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' as const, minHeight: 50 }}
          />
        </div>

        {message && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              backgroundColor: message.includes('saqlandi') ? 'rgba(124,255,79,0.1)' : 'rgba(255,59,48,0.1)',
              color: message.includes('saqlandi') ? '#7CFF4F' : '#FF3B30',
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#7CFF4F',
            color: '#0A0F0D',
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </form>
    </div>
  );
}

interface AgentTicket { id: string; sana: string; biletRaqam: string; yolovchi: string; sotishNarxi: number; airlineName: string; }
interface DebtRow { biletRaqam: string; qarz: number; tolangan: number; }

export default function BegzodPage() {
  const [period, setPeriod] = useState('today');
  const { data: authData } = useSWR('/api/avia/auth', fetcher);
  const agentName = authData?.user?.name || 'Kassir-Agent';

  const { from, to } = periodRange(period);
  const dateQs = `${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`;
  const agentEnc = encodeURIComponent(agentName);

  const { data: ticketsData, mutate: mutateTickets } = useSWR(
    `/api/avia/tickets?agent=${agentEnc}${dateQs}`,
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: true }
  );
  const { data: reportsData, mutate: mutateReports } = useSWR(
    `/api/avia/reports?agent=${agentEnc}${dateQs}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const tickets: AgentTicket[] = ticketsData?.tickets || [];
  const debts: DebtRow[] = reportsData?.debts || [];

  // bilet raqami -> qarz/to'langan
  const debtMap = new Map<string, DebtRow>();
  for (const d of debts) debtMap.set(d.biletRaqam, d);

  const jamiBiletlar = tickets.length;
  const jamiSotuv = tickets.reduce((s, t) => s + t.sotishNarxi, 0);
  const jamiQarz = debts.reduce((s, d) => s + d.qarz, 0);
  const jamiTolangan = tickets.reduce((s, t) => {
    const d = debtMap.get(t.biletRaqam);
    return s + (d ? d.tolangan : t.sotishNarxi);
  }, 0);
  const qarzli = debts.length;
  const yopilgan = Math.max(0, jamiBiletlar - qarzli);
  const progress = jamiBiletlar > 0 ? Math.round((yopilgan / jamiBiletlar) * 100) : 100;

  const refresh = () => { mutateTickets(); mutateReports(); };

  const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', color: '#8A9A8F', fontSize: 12, fontWeight: 500 };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Aviakassir — Bilet Yozish</h1>
          <div style={{ color: '#4A5C50', fontSize: 12, marginTop: 4 }}>Davr: {periodLabel(period)}</div>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="split-2">
        {/* Left: Form */}
        <TicketForm onSuccess={refresh} />

        {/* Right: KPI + Goal + Tickets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <div style={{ color: '#8A9A8F', fontSize: 12 }}>Biletlar</div>
              <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{jamiBiletlar}</div>
            </div>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <div style={{ color: '#8A9A8F', fontSize: 12 }}>Jami Sotuv</div>
              <div style={{ color: '#7CFF4F', fontSize: 22, fontWeight: 700 }}>{formatMoney(jamiSotuv)}</div>
            </div>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Wallet size={18} style={{ color: '#2CA5E0', flexShrink: 0 }} />
              <div>
                <div style={{ color: '#8A9A8F', fontSize: 11 }}>To&apos;langan</div>
                <div style={{ color: '#2CA5E0', fontSize: 17, fontWeight: 700 }}>{formatMoney(jamiTolangan)}</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={18} style={{ color: jamiQarz > 0 ? '#FF4444' : '#7CFF4F', flexShrink: 0 }} />
              <div>
                <div style={{ color: '#8A9A8F', fontSize: 11 }}>Qarz</div>
                <div style={{ color: jamiQarz > 0 ? '#FF4444' : '#7CFF4F', fontSize: 17, fontWeight: 700 }}>{formatMoney(jamiQarz)}</div>
              </div>
            </div>
          </div>

          {/* Goal: close all tickets */}
          <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 18, borderTop: `2px solid ${progress === 100 ? '#7CFF4F' : '#F5A623'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 14, fontWeight: 700 }}>
                <Target size={16} style={{ color: progress === 100 ? '#7CFF4F' : '#F5A623' }} />
                Maqsad: qarzlarni 100% yopish
              </div>
              <div style={{ color: progress === 100 ? '#7CFF4F' : '#F5A623', fontSize: 15, fontWeight: 800 }}>
                {yopilgan}/{jamiBiletlar} · {progress}%
              </div>
            </div>
            <div style={{ height: 8, borderRadius: 5, backgroundColor: '#0A0F0D', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: progress === 100 ? '#7CFF4F' : '#F5A623', transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ color: '#4A5C50', fontSize: 11, marginTop: 8 }}>
              {qarzli > 0 ? `${qarzli} ta biletda qarz qolgan` : 'Hamma biletlar yopilgan ✓'}
            </div>
          </div>

          {/* My Tickets with status */}
          <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 20 }}>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plane size={18} style={{ color: '#F5A623' }} />
              O&apos;z Biletlarim
            </h3>
            {tickets.length === 0 ? (
              <div style={{ color: '#4A5C50', textAlign: 'center', padding: 20, fontSize: 14 }}>Bu davrda bilet yo&apos;q</div>
            ) : (
              <div style={{ maxHeight: 380, overflowY: 'auto', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 440 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1E2E24' }}>
                      <th style={th}>Sana</th>
                      <th style={th}>Bilet</th>
                      <th style={th}>Yo&apos;lovchi</th>
                      <th style={{ ...th, textAlign: 'right' }}>Narx</th>
                      <th style={{ ...th, textAlign: 'right' }}>Holat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.slice().reverse().map((t) => {
                      const d = debtMap.get(t.biletRaqam);
                      const isQarzli = !!d && d.qarz > 0;
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid #1E2E24' }}>
                          <td style={{ padding: '8px 10px', color: '#8A9A8F', fontSize: 12 }}>{t.sana}</td>
                          <td style={{ padding: '8px 10px', color: '#fff', fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>{t.biletRaqam}</td>
                          <td style={{ padding: '8px 10px', color: '#fff', fontSize: 13 }}>{t.yolovchi}</td>
                          <td style={{ padding: '8px 10px', color: '#7CFF4F', fontSize: 13, textAlign: 'right' }}>{formatMoney(t.sotishNarxi)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            {isQarzli ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, backgroundColor: '#FF444418', color: '#FF4444', border: '1px solid #FF444430' }}>
                                <AlertTriangle size={10} /> {formatMoney(d!.qarz)}
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, backgroundColor: '#7CFF4F18', color: '#7CFF4F', border: '1px solid #7CFF4F30' }}>
                                <CheckCircle2 size={10} /> Yopilgan
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
