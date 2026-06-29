import { ImageResponse } from 'next/og';

// Saytga mos OG rasm (havola preview): qorong'i fon, yashil samolyot logo, SEM wordmark.
export const alt = 'SEM AviaKassa — Bilet Hisobi';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0F0D',
          position: 'relative',
        }}
      >
        {/* Tepa aksent chizig'i */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: 'linear-gradient(90deg, #7CFF4F, #2CA5E0)',
          }}
        />

        {/* Yashil samolyot badge (saytdagidek) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 140,
            height: 140,
            borderRadius: 34,
            backgroundColor: 'rgba(124,255,79,0.10)',
            border: '2px solid rgba(124,255,79,0.30)',
            marginBottom: 40,
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7CFF4F"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: 'rotate(-45deg)' }}
          >
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
        </div>

        {/* SEM AVIA wordmark */}
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: 100, fontWeight: 800, color: '#7CFF4F', letterSpacing: -2, marginRight: 18 }}>SEM</span>
          <span style={{ fontSize: 100, fontWeight: 800, color: '#ffffff', letterSpacing: -2 }}>AVIA</span>
        </div>

        {/* Mahsulot nomi */}
        <div style={{ display: 'flex', marginTop: 10, fontSize: 36, fontWeight: 700, color: '#ffffff' }}>
          AviaKassa — Bilet Hisobi
        </div>
        <div style={{ display: 'flex', marginTop: 14, fontSize: 24, color: '#8A9A8F' }}>
          Aviabilet hisobi va boshqaruv tizimi
        </div>
      </div>
    ),
    { ...size },
  );
}
