'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { Menu, Plane } from 'lucide-react';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Drawer nav bosilganda yoki backdrop bosilganda yopiladi (onClose orqali)

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0F0D' }}>
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Mobil drawer backdrop */}
      <div
        className={`sidebar-backdrop${open ? ' show' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', backgroundColor: '#0A0F0D' }}>
        {/* Mobil top-bar (faqat ≤900px) */}
        <div className="mobile-topbar">
          <button
            onClick={() => setOpen(true)}
            aria-label="Menyu"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40, borderRadius: 9, cursor: 'pointer',
              border: '1px solid #1E2E24', backgroundColor: '#141F19', color: '#fff',
            }}
          >
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, backgroundColor: '#7CFF4F18',
              border: '1px solid #7CFF4F30', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#7CFF4F',
            }}>
              <Plane size={16} style={{ transform: 'rotate(-45deg)' }} />
            </div>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>AviaKassa</span>
          </div>
        </div>

        <div className="main-content">{children}</div>
      </main>
    </div>
  );
}
