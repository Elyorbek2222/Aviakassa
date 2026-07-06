import type { MetadataRoute } from 'next';

// PWA manifesti — Windows/Edge, Android va boshqalar ilovani "o'rnatsin" (alohida
// oyna, Start menu ikonka, brauzer paneli ko'rinmaydi). Kesh service worker'da
// (public/sw.js) — tez ochiladi va internetsiz ham oxirgi ma'lumot ko'rinadi.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SEM Travel — Bilet Hisobi',
    short_name: 'SEM Avia',
    description: 'Aviabilet va turizm hisobi — SEM Travel',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0A0F0D',
    theme_color: '#0A0F0D',
    lang: 'uz',
    dir: 'ltr',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
