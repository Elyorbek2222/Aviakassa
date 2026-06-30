'use client';

import { useState } from 'react';
import { Cloud, Check, AlertCircle, FileSpreadsheet } from 'lucide-react';
import AviaUploadForm from '@/components/avia/AviaUploadForm';

export default function UploadPage() {
  const [gsheetLoading, setGsheetLoading] = useState(false);
  const [gsheetMsg, setGsheetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleGSheetImport = async (fresh: boolean) => {
    setGsheetLoading(true);
    setGsheetMsg(null);
    try {
      const res = await fetch('/api/avia/import-gsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fresh }),
      });
      const data = await res.json();
      if (res.ok) {
        setGsheetMsg({ type: 'success', text: data.message });
      } else {
        setGsheetMsg({ type: 'error', text: data.error || 'Xatolik' });
      }
    } catch {
      setGsheetMsg({ type: 'error', text: "Serverga ulanib bo'lmadi" });
    } finally {
      setGsheetLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Ma&apos;lumot Import
      </h1>

      {/* Google Sheets Import */}
      <div
        style={{
          backgroundColor: '#141F19',
          border: '1px solid #1E2E24',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Cloud size={24} color="#2CA5E0" />
          <div>
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: 0 }}>
              Google Sheets&apos;dan Import
            </h3>
            <p style={{ color: '#8A9A8F', fontSize: 13, margin: '4px 0 0' }}>
              3 ta sheet avtomatik o&apos;qiladi: Biletlar, Tolovlar, Inkassatsiya
            </p>
          </div>
        </div>

        {gsheetMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 16,
              backgroundColor: gsheetMsg.type === 'success' ? '#7CFF4F15' : '#FF444415',
              border: `1px solid ${gsheetMsg.type === 'success' ? '#7CFF4F30' : '#FF444430'}`,
              color: gsheetMsg.type === 'success' ? '#7CFF4F' : '#FF4444',
              fontSize: 14,
            }}
          >
            {gsheetMsg.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            {gsheetMsg.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => handleGSheetImport(false)}
            disabled={gsheetLoading}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: 10,
              border: '2px solid #2CA5E0',
              backgroundColor: '#2CA5E020',
              color: '#2CA5E0',
              fontSize: 15,
              fontWeight: 700,
              cursor: gsheetLoading ? 'wait' : 'pointer',
              opacity: gsheetLoading ? 0.7 : 1,
            }}
          >
            {gsheetLoading ? '⏳ Yuklanmoqda...' : '📥 QO\'SHIB YUKLASH'}
          </button>

          <button
            onClick={() => handleGSheetImport(true)}
            disabled={gsheetLoading}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: 10,
              border: '2px solid #F5A623',
              backgroundColor: '#F5A62320',
              color: '#F5A623',
              fontSize: 15,
              fontWeight: 700,
              cursor: gsheetLoading ? 'wait' : 'pointer',
              opacity: gsheetLoading ? 0.7 : 1,
            }}
          >
            {gsheetLoading ? '⏳ Yuklanmoqda...' : '🔄 YANGILASH (eski tozalanadi)'}
          </button>
        </div>

        <p style={{ color: '#4A5C50', fontSize: 12, marginTop: 12 }}>
          &quot;Qo&apos;shib yuklash&quot; — mavjud ma&apos;lumotlarga qo&apos;shadi. &quot;Yangilash&quot; — eskisini o&apos;chirib, yangidan yuklaydi.
        </p>
      </div>

      {/* Excel File Upload */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <FileSpreadsheet size={20} color="#7CFF4F" />
          <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: 0 }}>
            Yoki Excel fayldan yuklash
          </h3>
        </div>
        <AviaUploadForm />
      </div>
    </div>
  );
}
