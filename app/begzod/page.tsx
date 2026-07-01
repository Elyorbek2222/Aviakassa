'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { Plane, FileText, Wallet, CheckCircle2, AlertTriangle, Target, Pencil, Lock, X, ClipboardPaste } from 'lucide-react';
import { formatMoney, ticketEditRemainingMs, todayStr } from '@/lib/utils';
import { parseTicketText } from '@/lib/ticket-parse';
import { AIRLINE_LABELS, type AirlineKey, type AviaTicket } from '@/types/avia';
import PeriodFilter from '@/components/avia/PeriodFilter';
import { periodRange, periodLabel } from '@/lib/period';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function TicketForm({ onSuccess, suggestions, todayCount }: { onSuccess: () => void; suggestions: string[]; todayCount: number }) {
  const [form, setForm] = useState({
    airline: 'uzairways' as AirlineKey,
    biletRaqam: '',
    yolovchi: '',
    passengerCount: 1,
    tarif: '',
    sotishNarxi: '',
    izoh: '',
    sana: todayStr(), // sotuv sanasi — default bugun, orqaga (masalan iyun) qo'ysa bo'ladi
    qoshimchaFoyda: '', // alohida (ekstra) foyda — ixtiyoriy
    qoshimchaIzoh: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [parseInfo, setParseInfo] = useState('');
  const biletRef = useRef<HTMLInputElement>(null);
  const tarifRef = useRef<HTMLInputElement>(null);

  // Biletdan avtomatik to'ldirish: yo'lovchi, bilet raqami, aviakompaniya (+ narx bo'lsa)
  const FIELD_LABELS: Record<string, string> = {
    yolovchi: "Yo'lovchi", biletRaqam: 'Bilet raqami', airline: 'Aviakompaniya', narx: 'Narx', izoh: 'Izoh',
  };
  const doParse = (raw: string) => {
    const p = parseTicketText(raw);
    if (p.found.length === 0) {
      setParseInfo("❌ Ma'lumot topilmadi — qo'lda kiriting");
      return;
    }
    setForm((f) => ({
      ...f,
      airline: p.airline ?? f.airline,
      biletRaqam: p.biletRaqam ?? f.biletRaqam,
      yolovchi: p.yolovchi ?? f.yolovchi,
      sotishNarxi: p.sotishNarxi != null ? String(p.sotishNarxi) : f.sotishNarxi,
      izoh: p.izoh ?? f.izoh,
    }));
    setParseInfo('✓ ' + p.found.map((k) => FIELD_LABELS[k] || k).join(', ') + " to'ldirildi. Narxlarni tekshiring.");
    // Ism/raqam to'ldi — endi narxlarga o'tamiz
    setTimeout(() => tarifRef.current?.focus(), 0);
  };
  const handleParse = () => doParse(pasteText);
  const onPasteTicket = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted && pasted.length > 20) {
      e.preventDefault();
      setPasteText(pasted);
      doParse(pasted);
    }
  };

  const submitTicket = (allowDuplicate: boolean) =>
    fetch('/api/avia/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        airlineName: AIRLINE_LABELS[form.airline] || form.airline,
        tarif: Number(form.tarif),
        sotishNarxi: Number(form.sotishNarxi),
        izoh: form.izoh || undefined,
        sana: form.sana || undefined,
        qoshimchaFoyda: form.qoshimchaFoyda ? Number(form.qoshimchaFoyda) : undefined,
        qoshimchaIzoh: form.qoshimchaIzoh || undefined,
        allowDuplicate,
      }),
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      let res = await submitTicket(false);

      // 409 = dublikat bilet: foydalanuvchidan tasdiq so'rab, baribir qo'shish
      if (res.status === 409) {
        const d = await res.json().catch(() => ({}));
        if (d.duplicate && confirm(`${d.error}. Baribir qo'shilsinmi?`)) {
          res = await submitTicket(true);
        } else {
          setMessage(d.error || 'Dublikat bilet');
          setLoading(false);
          return;
        }
      }

      if (res.ok) {
        setMessage('Bilet saqlandi!');
        // Ketma-ket tez kiritish uchun: aviakompaniyani saqlab qolamiz va
        // kursorni darhol bilet raqami maydoniga qaytaramiz.
        setForm((f) => ({ airline: f.airline, biletRaqam: '', yolovchi: '', passengerCount: 1, tarif: '', sotishNarxi: '', izoh: '', sana: f.sana, qoshimchaFoyda: '', qoshimchaIzoh: '' }));
        setPasteText('');
        setParseInfo('');
        biletRef.current?.focus();
        onSuccess();
      } else {
        const d = await res.json().catch(() => ({}));
        setMessage(d.error || 'Xatolik yuz berdi');
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
      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <FileText size={20} style={{ color: '#7CFF4F' }} />
        Yangi Bilet
        {todayCount > 0 && (
          <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 20, backgroundColor: '#7CFF4F18', color: '#7CFF4F', fontSize: 12, fontWeight: 700 }}>
            Bugun: {todayCount} ta
          </span>
        )}
      </h3>
      <form onSubmit={handleSubmit}>
        {/* Tez to'ldirish: biletni bu yerga nusxa-joylash (paste) qiling */}
        <div style={{ marginBottom: 18, padding: 12, borderRadius: 10, border: '1px dashed rgba(124,255,79,0.35)', backgroundColor: 'rgba(124,255,79,0.04)' }}>
          <label style={{ ...labelStyle, color: '#7CFF4F', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <ClipboardPaste size={14} /> Biletni bu yerga tashlang (nusxa-joylash)
          </label>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            onPaste={onPasteTicket}
            placeholder="Uzbekistan Airways yoki boshqa bilet matnini shu yerga qo'ying — ism, raqam, aviakompaniya avtomatik to'ladi..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 58, fontSize: 12 }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={handleParse} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #7CFF4F', backgroundColor: 'rgba(124,255,79,0.14)', color: '#7CFF4F', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              To&apos;ldirish
            </button>
            {pasteText && (
              <button type="button" onClick={() => { setPasteText(''); setParseInfo(''); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #1E2E24', backgroundColor: 'transparent', color: '#8A9A8F', fontSize: 12, cursor: 'pointer' }}>
                Tozalash
              </button>
            )}
            {parseInfo && <span style={{ fontSize: 11.5, color: parseInfo.startsWith('✓') ? '#7CFF4F' : '#F5A623' }}>{parseInfo}</span>}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Sotuv sanasi</label>
          <input
            type="date"
            value={form.sana}
            max={todayStr()}
            onChange={(e) => setForm({ ...form, sana: e.target.value })}
            required
            style={inputStyle}
          />
          {form.sana !== todayStr() && (
            <div style={{ color: '#F5A623', fontSize: 11, marginTop: 5 }}>
              ⚠️ Orqa sana — foyda shu oyga (masalan iyunga) yoziladi, bugungi kunga emas.
            </div>
          )}
        </div>
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
            ref={biletRef}
            type="text"
            value={form.biletRaqam}
            onChange={(e) => setForm({ ...form, biletRaqam: e.target.value })}
            placeholder="001-1234567890"
            required
            autoFocus
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Yo&apos;lovchi Ismi</label>
          <input
            type="text"
            list="yolovchi-suggestions"
            value={form.yolovchi}
            onChange={(e) => setForm({ ...form, yolovchi: e.target.value })}
            placeholder="Familiya Ism"
            required
            style={inputStyle}
          />
          <datalist id="yolovchi-suggestions">
            {suggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Tarif (UZS)</label>
            <input
              ref={tarifRef}
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
          <label style={labelStyle}>Qo&apos;shimcha foyda (UZS) — ixtiyoriy</label>
          <input
            type="number"
            value={form.qoshimchaFoyda}
            onChange={(e) => setForm({ ...form, qoshimchaFoyda: e.target.value })}
            placeholder="0"
            min={0}
            style={inputStyle}
          />
          <div style={{ color: '#4A5C50', fontSize: 11, marginTop: 5 }}>
            Shu biletdan olingan alohida (ekstra) foyda. Sof foydaga qo&apos;shiladi.
          </div>
        </div>
        {form.qoshimchaFoyda && Number(form.qoshimchaFoyda) > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Qo&apos;shimcha foyda izohi</label>
            <input
              type="text"
              value={form.qoshimchaIzoh}
              onChange={(e) => setForm({ ...form, qoshimchaIzoh: e.target.value })}
              placeholder="Masalan: qimmat sotildi / maxsus marja"
              style={inputStyle}
            />
          </div>
        )}
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

interface DebtRow { biletRaqam: string; qarz: number; tolangan: number; }

// Aviakassir o'z biletini 48 soat ichida tahrirlash oynasi
function EditTicketModal({ ticket, onClose, onSaved }: { ticket: AviaTicket; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    airline: ticket.airline,
    biletRaqam: ticket.biletRaqam,
    yolovchi: ticket.yolovchi,
    passengerCount: ticket.passengerCount,
    tarif: String(ticket.tarif),
    sotishNarxi: String(ticket.sotishNarxi),
    izoh: ticket.izoh || '',
    sana: ticket.sana,
    qoshimchaFoyda: ticket.qoshimchaFoyda != null ? String(ticket.qoshimchaFoyda) : '',
    qoshimchaIzoh: ticket.qoshimchaIzoh || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMessage('');
    try {
      const res = await fetch('/api/avia/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ticket.id,
          airline: form.airline,
          biletRaqam: form.biletRaqam,
          yolovchi: form.yolovchi,
          passengerCount: Number(form.passengerCount),
          tarif: Number(form.tarif),
          sotishNarxi: Number(form.sotishNarxi),
          izoh: form.izoh || undefined,
          sana: form.sana || undefined,
          qoshimchaFoyda: form.qoshimchaFoyda === '' ? '' : Number(form.qoshimchaFoyda),
          qoshimchaIzoh: form.qoshimchaIzoh,
        }),
      });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json().catch(() => ({})); setMessage(d.error || 'Xatolik yuz berdi'); }
    } catch {
      setMessage('Serverga ulanib bo\'lmadi');
    } finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #1E2E24', backgroundColor: '#0A0F0D', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', color: '#8A9A8F', fontSize: 13, marginBottom: 6 };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto', zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 14, padding: 24, marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Pencil size={18} style={{ color: '#F5A623' }} /> Biletni tahrirlash
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8A9A8F', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Sotuv sanasi</label>
            <input type="date" value={form.sana} max={todayStr()} onChange={(e) => setForm({ ...form, sana: e.target.value })} required style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Aviakompaniya</label>
            <select value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value as AirlineKey })} style={inputStyle}>
              {Object.entries(AIRLINE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Bilet Raqami</label>
            <input type="text" value={form.biletRaqam} onChange={(e) => setForm({ ...form, biletRaqam: e.target.value })} required style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Yo&apos;lovchi Ismi</label>
            <input type="text" value={form.yolovchi} onChange={(e) => setForm({ ...form, yolovchi: e.target.value })} required style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Tarif (UZS)</label>
              <input type="number" value={form.tarif} onChange={(e) => setForm({ ...form, tarif: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Sotish Narxi (UZS)</label>
              <input type="number" value={form.sotishNarxi} onChange={(e) => setForm({ ...form, sotishNarxi: e.target.value })} required style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Yo&apos;lovchilar soni</label>
            <input type="number" value={form.passengerCount} onChange={(e) => setForm({ ...form, passengerCount: Number(e.target.value) })} min={1} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Qo&apos;shimcha foyda (UZS)</label>
            <input type="number" value={form.qoshimchaFoyda} min={0} placeholder="0" onChange={(e) => setForm({ ...form, qoshimchaFoyda: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Qo&apos;shimcha foyda izohi</label>
            <input type="text" value={form.qoshimchaIzoh} placeholder="Masalan: qimmat sotildi" onChange={(e) => setForm({ ...form, qoshimchaIzoh: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Kommentariya</label>
            <textarea value={form.izoh} onChange={(e) => setForm({ ...form, izoh: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }} />
          </div>
          {message && (
            <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: 'rgba(255,59,48,0.1)', color: '#FF3B30', fontSize: 13, marginBottom: 14 }}>{message}</div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #1E2E24', backgroundColor: 'transparent', color: '#8A9A8F', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Bekor qilish</button>
            <button type="submit" disabled={loading} style={{ flex: 2, padding: 12, borderRadius: 8, border: 'none', backgroundColor: '#F5A623', color: '#0A0F0D', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saqlanmoqda...' : 'O\'zgartirishni saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

  const tickets: AviaTicket[] = ticketsData?.tickets || [];
  const debts: DebtRow[] = reportsData?.debts || [];

  // Tez kiritish uchun yordamchilar: bugungi biletlar soni va yo'lovchi ismlari (avto-taklif)
  const today = todayStr();
  const todayCount = tickets.filter((t) => t.sana === today).length;
  const passengerSuggestions = Array.from(new Set(tickets.map((t) => t.yolovchi).filter(Boolean))).slice(0, 50);

  const [editing, setEditing] = useState<AviaTicket | null>(null);
  // Har daqiqa qayta hisoblash — 48 soatlik muddat jonli yangilanib tursin
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // bilet raqami -> qarz/to'langan
  const debtMap = new Map<string, DebtRow>();
  for (const d of debts) debtMap.set(d.biletRaqam, d);

  const jamiBiletlar = tickets.length;
  const jamiQarz = debts.reduce((s, d) => s + d.qarz, 0);
  const qarzli = debts.length;
  const yopilgan = Math.max(0, jamiBiletlar - qarzli);
  const progress = jamiBiletlar > 0 ? Math.round((yopilgan / jamiBiletlar) * 100) : 100;

  const refresh = () => { mutateTickets(); mutateReports(); };

  const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', color: '#8A9A8F', fontSize: 12, fontWeight: 500 };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Aviakassir — Biletlar kirgazish</h1>
          <div style={{ color: '#4A5C50', fontSize: 12, marginTop: 4 }}>Davr: {periodLabel(period)}</div>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="split-2">
        {/* Left: Form */}
        <TicketForm onSuccess={refresh} suggestions={passengerSuggestions} todayCount={todayCount} />

        {/* Right: KPI + Goal + Tickets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Holat kartalari — sotuv/foyda yo'q, faqat biletlar va to'lov holati */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Plane size={18} style={{ color: '#F5A623', flexShrink: 0, transform: 'rotate(-45deg)' }} />
              <div>
                <div style={{ color: '#8A9A8F', fontSize: 11 }}>Biletlar</div>
                <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{jamiBiletlar}</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={18} style={{ color: '#7CFF4F', flexShrink: 0 }} />
              <div>
                <div style={{ color: '#8A9A8F', fontSize: 11 }}>To&apos;langan biletlar</div>
                <div style={{ color: '#7CFF4F', fontSize: 20, fontWeight: 700 }}>{yopilgan}</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={18} style={{ color: qarzli > 0 ? '#FF4444' : '#7CFF4F', flexShrink: 0 }} />
              <div>
                <div style={{ color: '#8A9A8F', fontSize: 11 }}>Qarzli biletlar</div>
                <div style={{ color: qarzli > 0 ? '#FF4444' : '#7CFF4F', fontSize: 20, fontWeight: 700 }}>{qarzli}</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#141F19', border: '1px solid #1E2E24', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Wallet size={18} style={{ color: jamiQarz > 0 ? '#FF4444' : '#7CFF4F', flexShrink: 0 }} />
              <div>
                <div style={{ color: '#8A9A8F', fontSize: 11 }}>Jami qarz</div>
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
              <span style={{ marginLeft: 'auto', color: '#8A9A8F', fontSize: 12, fontWeight: 500 }}>
                {periodLabel(period)} · {tickets.length} ta
              </span>
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
                      <th style={{ ...th, textAlign: 'right' }}>To&apos;lov holati</th>
                      <th style={{ ...th, textAlign: 'right' }}>Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.slice().reverse().map((t) => {
                      const d = debtMap.get(t.biletRaqam);
                      const qarz = d ? d.qarz : 0;
                      const tolangan = d ? d.tolangan : t.sotishNarxi;
                      const badge: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 };
                      const remaining = ticketEditRemainingMs(t, now);
                      const editable = remaining > 0;
                      const soatQoldi = Math.floor(remaining / 3600000);
                      const daqiqaQoldi = Math.max(0, Math.floor(remaining / 60000));
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid #1E2E24' }}>
                          <td style={{ padding: '8px 10px', color: '#8A9A8F', fontSize: 12 }}>{t.sana}</td>
                          <td style={{ padding: '8px 10px', color: '#fff', fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>{t.biletRaqam}</td>
                          <td style={{ padding: '8px 10px', color: '#fff', fontSize: 13 }}>{t.yolovchi}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            {qarz <= 0 ? (
                              <span style={{ ...badge, backgroundColor: '#7CFF4F18', color: '#7CFF4F', border: '1px solid #7CFF4F30' }}>
                                <CheckCircle2 size={10} /> To&apos;landi
                              </span>
                            ) : tolangan > 0 ? (
                              <span style={{ ...badge, backgroundColor: '#F5A62318', color: '#F5A623', border: '1px solid #F5A62340' }} title={`To'langan: ${formatMoney(tolangan)}`}>
                                <AlertTriangle size={10} /> Qisman · qarz {formatMoney(qarz)}
                              </span>
                            ) : (
                              <span style={{ ...badge, backgroundColor: '#FF444418', color: '#FF4444', border: '1px solid #FF444430' }}>
                                <X size={10} /> To&apos;lanmadi · {formatMoney(qarz)}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            {editable ? (
                              <button
                                onClick={() => setEditing(t)}
                                title={soatQoldi >= 1 ? `${soatQoldi} soat tahrirlash mumkin` : `${daqiqaQoldi} daqiqa qoldi`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', backgroundColor: '#F5A62318', color: '#F5A623', border: '1px solid #F5A62340' }}
                              >
                                <Pencil size={11} /> {soatQoldi >= 1 ? `${soatQoldi} soat` : `${daqiqaQoldi} daq`}
                              </button>
                            ) : (
                              <span title="48 soatlik tahrirlash muddati tugagan" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#4A5C50', fontSize: 11 }}>
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
          </div>
        </div>
      </div>

      {editing && (
        <EditTicketModal ticket={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      )}
    </div>
  );
}
