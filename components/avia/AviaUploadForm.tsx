'use client';

import { useState, useRef, DragEvent } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';

interface Props {
  onSuccess?: () => void;
}

export default function AviaUploadForm({ onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'all'); // bitta fayl — 3 ta sheet

      const res = await fetch('/api/avia/upload', { method: 'POST', body: formData });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Yuklashda xatolik');
      }

      const data = await res.json();
      setMessage({ type: 'success', text: data.message });
      setFile(null);
      onSuccess?.();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Xatolik' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#141F19',
        border: '1px solid #1E2E24',
        borderRadius: 12,
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <FileSpreadsheet size={24} color="#7CFF4F" />
        <div>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: 0 }}>
            AviaKassa.xlsx yuklash
          </h3>
          <p style={{ color: '#8A9A8F', fontSize: 13, margin: '4px 0 0' }}>
            Bitta Excel fayl — 3 ta sheet: Biletlar, Tolovlar, Inkassatsiya
          </p>
        </div>
      </div>

      {message && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            backgroundColor: message.type === 'success' ? '#7CFF4F15' : '#FF444415',
            border: `1px solid ${message.type === 'success' ? '#7CFF4F30' : '#FF444430'}`,
            color: message.type === 'success' ? '#7CFF4F' : '#FF4444',
            fontSize: 14,
          }}
        >
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${file ? '#7CFF4F' : '#1E2E24'}`,
          borderRadius: 12,
          padding: 40,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: file ? '#7CFF4F08' : '#0A0F0D',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ display: 'none' }}
        />
        <Upload size={40} style={{ color: file ? '#7CFF4F' : '#4A5C50', marginBottom: 12 }} />
        <div style={{ color: file ? '#7CFF4F' : '#fff', fontSize: 16, fontWeight: 500 }}>
          {file ? file.name : 'AviaKassa.xlsx faylni shu yerga tashlang'}
        </div>
        <div style={{ color: '#4A5C50', fontSize: 13, marginTop: 6 }}>
          yoki bosib tanlang (.xlsx)
        </div>
      </div>

      {file && (
        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '14px 20px',
            borderRadius: 10,
            border: 'none',
            backgroundColor: '#7CFF4F',
            color: '#0A0F0D',
            fontSize: 16,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '⏳ Yuklanmoqda...' : '📥 IMPORT QILISH'}
        </button>
      )}

      {/* Sheet format guide */}
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0A0F0D' }}>
          <div style={{ color: '#7CFF4F', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📋 Sheet 1: Biletlar</div>
          <div style={{ color: '#4A5C50', fontSize: 11, lineHeight: 1.6 }}>
            SANA, O&apos;zHYo, Silk, Centrum, Don, Easy, Boshqa, Boshqa nomi, Bilet raqam, Yo&apos;lovchi, Tarif, Sotish narxi, Agent
          </div>
        </div>
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0A0F0D' }}>
          <div style={{ color: '#2CA5E0', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>💰 Sheet 2: Tolovlar</div>
          <div style={{ color: '#4A5C50', fontSize: 11, lineHeight: 1.6 }}>
            SANA, Mijoz, Summa, To&apos;lov turi, Bilet raqam, Valyuta, Dollar summa, Kurs, Izoh
          </div>
        </div>
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0A0F0D' }}>
          <div style={{ color: '#9B59B6', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🏦 Sheet 3: Inkassatsiya</div>
          <div style={{ color: '#4A5C50', fontSize: 11, lineHeight: 1.6 }}>
            SANA, Partnyyor, Summa, Izoh
          </div>
        </div>
      </div>
    </div>
  );
}
