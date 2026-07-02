'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/avia/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Xatolik yuz berdi');
        setLoading(false);
        return;
      }

      const role = data.user?.role;
      switch (role) {
        case 'admin':
          router.push('/');
          break;
        case 'begzod':
          router.push('/begzod');
          break;
        case 'kassir':
          router.push('/kassir');
          break;
        case 'buxgalter':
          router.push('/buxgalter');
          break;
        case 'sardor':
          router.push('/turizm');
          break;
        default:
          router.push('/');
      }
    } catch {
      setError("Serverga ulanib bo'lmadi");
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => ({
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    border: `1.5px solid ${focusedField === field ? '#7CFF4F' : '#1E2E24'}`,
    backgroundColor: '#0A0F0D',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(124, 255, 79, 0.12)' : 'none',
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0A0F0D',
        position: 'relative',
        overflow: 'hidden',
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      {/* Background dot grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, #1E2E24 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      {/* Ambient glow behind card */}
      <div
        style={{
          position: 'absolute',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,255,79,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '40px 32px',
          borderRadius: 20,
          backgroundColor: '#141F19',
          border: '1px solid #1E2E24',
          position: 'relative',
          animation: 'fadeInUp 0.4s ease both',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Top gradient border line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 40,
            right: 40,
            height: 1,
            background: 'linear-gradient(90deg, transparent, #7CFF4F60, #2CA5E060, transparent)',
            borderRadius: 1,
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 36,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: 'rgba(124, 255, 79, 0.08)',
              border: '1.5px solid rgba(124, 255, 79, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              animation: 'pulse-glow 2.5s ease-in-out infinite',
              color: '#7CFF4F',
            }}
          >
            <Plane size={32} style={{ transform: 'rotate(-45deg)' }} />
          </div>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            SEM Travel
          </h1>
          <p style={{ color: '#4A5C50', fontSize: 13, margin: '6px 0 0', letterSpacing: '0.02em' }}>
            Boshqaruv tizimiga kirish
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#8A9A8F', fontSize: 12, fontWeight: 600, marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Login
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              placeholder="Login kiriting"
              required
              style={inputStyle('username')}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', color: '#8A9A8F', fontSize: 12, fontWeight: 600, marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Parol
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder="Parolni kiriting"
              required
              style={inputStyle('password')}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                backgroundColor: 'rgba(255, 59, 48, 0.08)',
                border: '1px solid rgba(255, 59, 48, 0.25)',
                color: '#FF3B30',
                fontSize: 13,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16 }}>⚠</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 12,
              border: '1.5px solid #7CFF4F',
              backgroundColor: hovering && !loading ? 'transparent' : '#7CFF4F',
              color: hovering && !loading ? '#7CFF4F' : '#000',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              transition: 'background-color 0.2s ease, color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(0,0,0,0.3)',
                    borderTopColor: '#000',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                Kirish...
              </>
            ) : (
              <>
                <Plane size={15} style={{ transform: 'rotate(-45deg)' }} />
                Kirish
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
