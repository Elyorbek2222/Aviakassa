'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  FileText,
  CreditCard,
  AlertTriangle,
  Upload,
  Sliders,
  Plane,
  LogOut,
  Landmark,
} from 'lucide-react';
import { ROLE_PAGES, type UserRole, type AuthUser } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <BarChart3 size={20} /> },
  { href: '/tickets', label: 'Biletlar', icon: <FileText size={20} /> },
  { href: '/payments', label: "To'lovlar", icon: <CreditCard size={20} /> },
  { href: '/debts', label: 'Qarzdorlik', icon: <AlertTriangle size={20} /> },
  { href: '/inkassatsiya', label: 'Inkassatsiya', icon: <Landmark size={20} /> },
  { href: '/upload', label: 'Excel Yuklash', icon: <Upload size={20} /> },
  { href: '/settings', label: 'Sozlamalar', icon: <Sliders size={20} /> },
  { href: '/begzod', label: 'Bilet Yozish', icon: <FileText size={20} /> },
  { href: '/begzod/debts', label: 'Qarzdorlar', icon: <AlertTriangle size={20} /> },
  { href: '/kassir', label: 'Prixod', icon: <CreditCard size={20} /> },
  { href: '/buxgalter', label: 'Inkassatsiya', icon: <Landmark size={20} /> },
];

const ROLE_ACCENT: Record<UserRole, string> = {
  admin: '#7CFF4F',
  kassir: '#2CA5E0',
  begzod: '#F5A623',
  buxgalter: '#9B59B6',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetch('/api/avia/auth')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const role = user?.role || 'admin';
  const accent = ROLE_ACCENT[role];
  const allowedPages = ROLE_PAGES[role] || [];
  const navItems = ALL_NAV_ITEMS.filter((item) => allowedPages.includes(item.href));

  const handleLogout = async () => {
    await fetch('/api/avia/auth', { method: 'DELETE' });
    router.push('/login');
  };

  return (
    <aside
      style={{
        width: 240,
        backgroundColor: '#111815',
        borderRight: '1px solid #1E2E24',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        minHeight: '100vh',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 8px 20px',
          borderBottom: '1px solid #1E2E24',
          marginBottom: 20,
        }}
      >
        <Plane size={28} style={{ color: accent }} />
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>AviaKassa</span>
      </div>

      {/* User info */}
      {user && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: 16,
            borderRadius: 8,
            backgroundColor: '#141F19',
          }}
        >
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{user.name}</div>
          <div style={{ color: '#8A9A8F', fontSize: 12 }}>{role}</div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#fff' : '#8A9A8F',
                backgroundColor: isActive ? accent + '20' : 'transparent',
                borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ color: isActive ? accent : '#4A5C50' }}>{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 16px',
          borderRadius: 8,
          border: '1px solid #FF5C5C40',
          backgroundColor: '#FF5C5C15',
          color: '#FF5C5C',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: 12,
          width: '100%',
        }}
      >
        <LogOut size={18} />
        CHIQISH
      </button>
    </aside>
  );
}
