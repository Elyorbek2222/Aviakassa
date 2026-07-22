'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { TrendingDown, Search, Pencil, Lock, X, Wallet, ListChecks } from 'lucide-react';
import { formatMoney, ticketEditRemainingMs } from '@/lib/utils';
import { AIRLINE_LABELS, type Refund, type AirlineKey } from '@/types/avia';
import RefundForm from '@/components/avia/RefundForm';
import { inputStyle, labelStyle, MessageBox } from '@/components/avia/formStyles';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const T = { card: '#141F19', line: '#1E2E24', mut: '#8A9A8F', dim: '#4A5C50', text: '#fff', orange: '#F5A623', red: '#FF5C5C' };

// Refundni 48 soat ichida tuzatish (summa/izoh). Kassir sahifasidagi modal
// olib tashlangani uchun bu yerda mustaqil yozildi.
function RefundEditModal({ refund, onClose, onSaved }: { refund: Refund; onClose: () => void; onSaved: () => void }) {
  const [summa, setSumma] = useState(String(refund.summa));
  const [airline, setAirline] = useState<AirlineKey>(refund.airline || 'uzairways');
  const [manba, setManba] = useState(refund.manba || '');
  const [izoh, setIzoh] = useState(refund.izoh || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage('');
    try {
      const res = await fetch('/api/avia/refund', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: refund.id, summa: Number(summa), airline, airlineName: AIRLINE_LABELS[airline] || airline, manba, izoh }),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json().catch(() => ({})); setMessage(d.error || 'Xatolik'); }
    } catch { setMessage("Serverga ulanib bo'lmadi"); }
    finally { setLoading(false); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto', zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, backgroundColor: T.card, border: `1px solid ${T.line}`, borderTop: `2px solid ${T.orange}`, borderRadius: 14, padding: 24, marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ color: T.text, fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pencil size={18} style={{ color: T.orange }} /> Refundni tahrirlash
          </h3>
          <button onClick={onClose} aria-label="Yopish" style={{ background: 'none', border: 'none', color: T.mut, cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
        </div>
        <form onSubmit={submit}>
          <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: T.orange + '10', border: `1px solid ${T.orange}25`, marginBottom: 14, fontSize: 12, color: T.mut }}>
            {refund.mijozIsmi || '—'} · {refund.biletRaqam || 'bilet yo‘q'}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Qaytarilgan summa (UZS)</label>
            <input type="number" value={summa} onChange={(e) => setSumma(e.target.value)} required style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Aviakompaniya</label>
              <select value={airline} onChange={(e) => setAirline(e.target.value as AirlineKey)} style={inputStyle}>
                {Object.entries(AIRLINE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Qaysi joydan (manba)</label>
              <input type="text" value={manba} onChange={(e) => setManba(e.target.value)} placeholder="Centrum, to'g'ridan…" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Izoh</label>
            <input type="text" value={izoh} onChange={(e) => setIzoh(e.target.value)} style={inputStyle} />
          </div>
          <MessageBox message={message} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 8, border: `1px solid ${T.line}`, backgroundColor: 'transparent', color: T.mut, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Bekor qilish</button>
            <button type="submit" disabled={loading} style={{ flex: 2, padding: 12, borderRadius: 8, border: 'none', backgroundColor: T.orange, color: '#0A0F0D', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saqlanmoqda...' : "O'zgartirishni saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BegzodRefundPage() {
  const { data, mutate } = useSWR('/api/avia/refund', fetcher, { refreshInterval: 60000 });
  const refundlar = (data?.refundlar || []) as Refund[];

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Refund | null>(null);
  // 48 soatlik muddat jonli yangilanib tursin
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);

  const q = search.trim().toLowerCase();
  const rows = refundlar
    .filter((r) => !q || `${r.biletRaqam} ${r.mijozIsmi} ${r.izoh || ''}`.toLowerCase().includes(q))
    .slice()
    .sort((a, b) => (a.sana < b.sana ? 1 : a.sana > b.sana ? -1 : 0));

  const jamiRefund = refundlar.reduce((s, r) => s + r.summa, 0);
  // Oldingi manbalar — tez tanlash uchun (datalist)
  const manbaSuggestions = Array.from(new Set(refundlar.map((r) => r.manba).filter((m): m is string => !!m))).slice(0, 30);

  const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', color: T.mut, fontSize: 12, fontWeight: 500 };
  const kpiCard = (label: string, value: string, color: string, Icon: typeof Wallet) => (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon size={18} style={{ color, flexShrink: 0 }} />
      <div>
        <div style={{ color: T.mut, fontSize: 11 }}>{label}</div>
        <div style={{ color, fontSize: 18, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div>
      <h1 style={{ color: T.text, fontSize: 24, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
        <TrendingDown size={24} style={{ color: T.orange }} /> Refund — bilet puli qaytarish
      </h1>
      <div style={{ color: T.dim, fontSize: 12, marginBottom: 20 }}>
        Bilet bekor qilinib mijozga pul qaytarilsa — shu yerga yozing. Refund <b style={{ color: T.mut }}>alohida qayd</b> bo‘lib turadi: sotuv, foyda va kassa hisobiga qo‘shilmaydi.
      </div>

      <div className="split-2">
        {/* Chap: kiritish formasi */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.line}`, borderTop: `2px solid ${T.orange}50`, borderRadius: 14, padding: 22 }}>
          <h3 style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingDown size={16} style={{ color: T.orange }} /> Yangi Refund
          </h3>
          <RefundForm onSuccess={mutate} manbaSuggestions={manbaSuggestions} />
        </div>

        {/* O'ng: KPI + jadval */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {kpiCard('Jami qaytarilgan', formatMoney(jamiRefund) + " so'm", T.orange, Wallet)}
            {kpiCard('Refundlar soni', String(refundlar.length), T.mut, ListChecks)}
          </div>

          <div style={{ backgroundColor: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: 18 }}>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: T.dim }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Bilet, mijoz yoki izoh bo'yicha…"
                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: `1px solid ${T.line}`, backgroundColor: '#0A0F0D', color: T.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {!data ? (
              <div style={{ color: T.mut, textAlign: 'center', padding: 40, fontSize: 14 }}>Yuklanmoqda...</div>
            ) : rows.length === 0 ? (
              <div style={{ color: T.dim, textAlign: 'center', padding: 40, fontSize: 14 }}>{q ? 'Topilmadi' : 'Hozircha refund yo‘q'}</div>
            ) : (
              <div style={{ maxHeight: '58vh', overflowY: 'auto', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                      <th style={th}>Sana</th>
                      <th style={th}>Bilet</th>
                      <th style={th}>Mijoz</th>
                      <th style={th}>Aviakompaniya</th>
                      <th style={th}>Manba</th>
                      <th style={{ ...th, textAlign: 'right' }}>Summa</th>
                      <th style={th}>Izoh</th>
                      <th style={{ ...th, textAlign: 'right' }}>Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const remaining = ticketEditRemainingMs(r, now);
                      const editable = remaining > 0;
                      const soat = Math.floor(remaining / 3600000);
                      return (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${T.line}` }}>
                          <td style={{ padding: '9px 12px', color: T.mut, fontSize: 12 }}>{r.sana}</td>
                          <td style={{ padding: '9px 12px', color: T.text, fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>{r.biletRaqam || '—'}</td>
                          <td style={{ padding: '9px 12px', color: T.text, fontSize: 13 }}>{r.mijozIsmi || '—'}</td>
                          <td style={{ padding: '9px 12px', color: T.mut, fontSize: 12 }}>{r.airlineName || (r.airline ? AIRLINE_LABELS[r.airline] : '') || '—'}</td>
                          <td style={{ padding: '9px 12px', color: T.mut, fontSize: 12 }}>{r.manba || '—'}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right', color: T.orange, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>−{formatMoney(r.summa)}</td>
                          <td style={{ padding: '9px 12px', color: T.dim, fontSize: 12 }}>{r.izoh || '—'}</td>
                          <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                            {editable ? (
                              <button onClick={() => setEditing(r)} title={`${soat} soat ichida tahrirlash mumkin`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', backgroundColor: T.orange + '18', color: T.orange, border: `1px solid ${T.orange}40` }}>
                                <Pencil size={11} /> {soat}s
                              </button>
                            ) : (
                              <span title="48 soatlik tahrirlash muddati tugagan" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.dim, fontSize: 11 }}>
                                <Lock size={11} /> yopiq
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
            <div style={{ color: T.dim, fontSize: 12, marginTop: 12, textAlign: 'right' }}>Jami: {rows.length} ta refund</div>
          </div>
        </div>
      </div>

      {editing && <RefundEditModal refund={editing} onClose={() => setEditing(null)} onSaved={mutate} />}
    </div>
  );
}
