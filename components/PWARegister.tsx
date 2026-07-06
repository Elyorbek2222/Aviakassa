'use client';

import { useEffect } from 'react';

// Service worker'ni ro'yxatdan o'tkazadi (kesh + oflayn). Xato bo'lsa jim
// o'tkazib yuboramiz — ilova SW'siz ham to'liq ishlaydi.
export default function PWARegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(() => {});
  }, []);
  return null;
}
