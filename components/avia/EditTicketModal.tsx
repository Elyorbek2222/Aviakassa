'use client';

import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { todayStr } from '@/lib/utils';
import { AIRLINE_LABELS, type AirlineKey, type AviaTicket } from '@/types/avia';

// Biletni tahrirlash oynasi. Ruxsat serverda: admin — cheksiz, begzod — o'z bileti 48 soat ichida.
export default function EditTicketModal({ ticket, onClose, onSaved }: { ticket: AviaTicket; onClose: () => void; onSaved: () => void }) {
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
