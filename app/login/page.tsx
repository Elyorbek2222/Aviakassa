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
        default:
          router.push('/');
      }
    } catch {
      setError('Serverga ulanib bo\'lmadi');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0A0F0D',
      }}
    >
      <div
        style={{
          width: 400,
          padding: 40,
          borderRadius: 16,
          backgroundColor: '#141F19',
          border: '1px solid #1E2E24',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <Plane size={48} style={{ color: '#7CFF4F', marginBottom: 12 }} />
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>
            Avia Kassa
          </h1>
          <p style={{ color: '#8A9A8F', fontSize: 14, margin: '4px 0 0' }}>
            Tizimga kirish
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{ display: 'block', color: '#8A9A8F', fontSize: 13, marginBottom: 6 }}
            >
              Login
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Login kiriting"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #1E2E24',
                backgroundColor: '#0A0F0D',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{ display: 'block', color: '#8A9A8F', fontSize: 13, marginBottom: 6 }}
            >
              Parol
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parolni kiriting"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #1E2E24',
                backgroundColor: '#0A0F0D',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(255, 59, 48, 0.1)',
                border: '1px solid rgba(255, 59, 48, 0.3)',
                color: '#FF3B30',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 10,
              border: '2px solid #7CFF4F',
              backgroundColor: '#7CFF4F',
              color: '#000000',
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              letterSpacing: '0.5px',
              textTransform: 'uppercase' as const,
            }}
          >
            {loading ? '⏳ Kirish...' : '→ KIRISH'}
          </button>
        </form>
      </div>
    </div>
  );
}
