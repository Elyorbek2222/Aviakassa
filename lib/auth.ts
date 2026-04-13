// Cookie-based auth with 4 roles
// NOTE: Does NOT import cookies() from next/headers to avoid edge middleware issues

export type UserRole = 'admin' | 'kassir' | 'begzod' | 'buxgalter';

export interface AuthUser {
  username: string;
  role: UserRole;
  name: string;
}

export const SESSION_COOKIE_NAME = 'avia-session';

export const ROLE_PAGES: Record<UserRole, string[]> = {
  admin: ['/', '/tickets', '/payments', '/debts', '/inkassatsiya', '/upload', '/settings'],
  begzod: ['/begzod', '/begzod/debts'],
  kassir: ['/kassir'],
  buxgalter: ['/buxgalter'],
};

export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/',
  begzod: '/begzod',
  kassir: '/kassir',
  buxgalter: '/buxgalter',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  kassir: 'Kassir',
  begzod: 'Kassir-Agent',
  buxgalter: 'Buxgalter',
};

// ===== Authentication =====

const USERS: { username: string; password: string; role: UserRole; name: string }[] = [
  {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: 'admin',
    name: 'Administrator',
  },
  {
    username: process.env.KASSIR_USERNAME || 'kassir',
    password: process.env.KASSIR_PASSWORD || 'kassir123',
    role: 'kassir',
    name: 'Kassir',
  },
  {
    username: process.env.BEGZOD_USERNAME || 'begzod',
    password: process.env.BEGZOD_PASSWORD || 'begzod123',
    role: 'begzod',
    name: 'Kassir-Agent',
  },
  {
    username: process.env.BUXGALTER_USERNAME || 'buxgalter',
    password: process.env.BUXGALTER_PASSWORD || 'buxgalter123',
    role: 'buxgalter',
    name: 'Buxgalter',
  },
];

export function authenticate(username: string, password: string): AuthUser | null {
  const user = USERS.find((u) => u.username === username && u.password === password);
  if (!user) return null;
  return { username: user.username, role: user.role, name: user.name };
}

// ===== Session Token =====

const AUTH_SECRET = process.env.AUTH_SECRET || 'aviakassa-secret-key-2026';

export function createSessionToken(user: AuthUser): string {
  const payload = JSON.stringify({
    username: user.username,
    role: user.role,
    name: user.name,
    secret: AUTH_SECRET,
    ts: Date.now(),
  });
  // Base64 encode with secret prefix for basic tamper detection
  return Buffer.from(`${AUTH_SECRET}:${payload}`).toString('base64');
}

export function getSessionFromToken(token: string): AuthUser | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex === -1) return null;

    const prefix = decoded.slice(0, separatorIndex);
    if (prefix !== AUTH_SECRET) return null;

    const payloadStr = decoded.slice(separatorIndex + 1);
    const payload = JSON.parse(payloadStr);

    if (!payload.username || !payload.role || !payload.name) return null;
    if (payload.secret !== AUTH_SECRET) return null;

    return {
      username: payload.username,
      role: payload.role as UserRole,
      name: payload.name,
    };
  } catch {
    return null;
  }
}
