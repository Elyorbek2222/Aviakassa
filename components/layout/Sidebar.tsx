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
  BookOpen,
} from 'lucide-react';
import { ROLE_PAGES, type UserRole, type AuthUser } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <BarChart3 size={18} /> },
  { href: '/tickets', label: 'Biletlar', icon: <FileText size={18} /> },
  { href: '/payments', label: "To'lovlar", icon: <CreditCard size={18} /> },
  { href: '/debts', label: 'Qarzdorlik', icon: <AlertTriangle size={18} /> },
  { href: '/inkassatsiya', label: 'Inkassatsiya', icon: <Landmark size={18} /> },
  { href: '/upload', label: 'Excel Yuklash', icon: <Upload size={18} /> },
  { href: '/settings', label: 'Sozlamalar', icon: <Sliders size={18} /> },
  { href: '/begzod', label: 'Bilet Yozish', icon: <FileText size={18} /> },
  { href: '/begzod/debts', label: 'Qarzdorlar', icon: <AlertTriangle size={18} /> },
  { href: '/kassir', label: 'Finansist', icon: <CreditCard size={18} /> },
  { href: '/buxgalter', label: 'Inkassatsiya', icon: <Landmark size={18} /> },
  { href: '/qollanma', label: "Qo'llanma", icon: <BookOpen size={18} /> },
];

const ROLE_ACCENT: Record<UserRole, string> = {
  admin: '#7CFF4F',
  kassir: '#2CA5E0',
  begzod: '#F5A623',
  buxgalter: '#9B59B6',
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  kassir: 'Finansist',
  begzod: 'Aviakassir',
  buxgalter: 'Buxgalter',
};

export default function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [logoutHover, setLogoutHover] = useState(false);

  useEffect(() => {
    fetch('/api/avia/auth')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const role = user?.role ?? null;
  const accent = role ? ROLE_ACCENT[role] : '#4A5C50';
  const allowedPages = role ? (ROLE_PAGES[role] || []) : [];
  const navItems = ALL_NAV_ITEMS.filter((item) => allowedPages.includes(item.href));

  const handleLogout = async () => {
    await fetch('/api/avia/auth', { method: 'DELETE' });
    router.push('/login');
  };

  return (
    <aside
      className={`app-sidebar${open ? ' open' : ''}`}
      style={{
        width: 240,
        backgroundColor: '#111815',
        borderRight: '1px solid #1E2E24',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        minHeight: '100vh',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '4px 8px 20px',
          borderBottom: '1px solid #1E2E24',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: accent + '18',
            border: `1px solid ${accent}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            flexShrink: 0,
          }}
        >
          <Plane size={18} style={{ transform: 'rotate(-45deg)' }} />
        </div>
        <div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
            AviaKassa
          </div>
          <div style={{ color: '#4A5C50', fontSize: 10, letterSpacing: '0.08em' }}>
            MANAGEMENT
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isHovered = hoveredItem === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={onClose}
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 9,
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#fff' : isHovered ? '#c8d8cc' : '#8A9A8F',
                backgroundColor: isActive
                  ? accent + '18'
                  : isHovered
                  ? '#1E2E24'
                  : 'transparent',
                borderLeft: `3px solid ${isActive ? accent : 'transparent'}`,
                transition: 'all 0.15s ease',
                transform: isHovered && !isActive ? 'translateX(3px)' : 'none',
              }}
            >
              <span
                style={{
                  color: isActive ? accent : isHovered ? accent + 'CC' : '#4A5C50',
                  transition: 'color 0.15s ease',
                  display: 'flex',
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* User info card */}
      {user && (
        <div
          style={{
            padding: '12px 12px',
            marginTop: 12,
            borderRadius: 10,
            backgroundColor: '#0A0F0D',
            border: '1px solid #1E2E24',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: accent + '20',
              border: `1px solid ${accent}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accent,
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: accent + '18',
                color: accent,
                fontSize: 10,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 4,
                letterSpacing: '0.06em',
                marginTop: 2,
              }}
            >
              {role ? ROLE_LABEL[role] : '...'}
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        onMouseEnter={() => setLogoutHover(true)}
        onMouseLeave={() => setLogoutHover(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '10px 16px',
          borderRadius: 9,
          border: `1px solid ${logoutHover ? '#FF5C5C80' : '#FF5C5C30'}`,
          backgroundColor: logoutHover ? '#FF5C5C18' : '#FF5C5C0A',
          color: logoutHover ? '#FF7070' : '#FF5C5C',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: 8,
          width: '100%',
          transition: 'all 0.15s ease',
          letterSpacing: '0.06em',
        }}
      >
        <LogOut size={15} />
        CHIQISH
      </button>
    </aside>
  );
}
