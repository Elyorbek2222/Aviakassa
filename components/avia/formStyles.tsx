'use client';

// Umumiy form stillari va xabar bloki — Prixod / Rasxod / Refund formalarida ishlatiladi.

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 9,
  border: '1px solid #1E2E24',
  backgroundColor: '#0A0F0D',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#4A5C50',
  fontSize: 11,
  fontWeight: 600,
  marginBottom: 7,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
};

export function MessageBox({ message }: { message: string }) {
  if (!message) return null;
  const ok = message.toLowerCase().includes('saqlandi');
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 9,
      backgroundColor: ok ? 'rgba(124,255,79,0.08)' : 'rgba(255,59,48,0.08)',
      border: `1px solid ${ok ? 'rgba(124,255,79,0.25)' : 'rgba(255,59,48,0.25)'}`,
      color: ok ? '#7CFF4F' : '#FF3B30',
      fontSize: 13, marginBottom: 14,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span>{ok ? '✓' : '⚠'}</span> {message}
    </div>
  );
}
