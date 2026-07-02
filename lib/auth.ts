// Cookie-based auth with 4 roles
// NOTE: Does NOT import cookies() from next/headers to avoid edge middleware issues

export type UserRole = 'admin' | 'kassir' | 'begzod' | 'buxgalter' | 'sardor';

export interface AuthUser {
  username: string;
  role: UserRole;
  name: string;
}

export const SESSION_COOKIE_NAME = 'avia-session';

export const ROLE_PAGES: Record<UserRole, string[]> = {
  admin: ['/', '/tickets', '/payments', '/debts', '/inkassatsiya', '/upload', '/otchot', '/prixot', '/turizm', '/settings', '/audit', '/qollanma', '/kassir', '/begzod', '/begzod/royxat', '/begzod/debts', '/buxgalter'],
  begzod: ['/begzod', '/begzod/royxat', '/begzod/debts', '/otchot', '/qollanma'],
  kassir: ['/kassir', '/tickets', '/debts', '/otchot', '/qollanma'],
  buxgalter: ['/buxgalter', '/otchot', '/qollanma'],
  sardor: ['/turizm', '/qollanma'],
};

export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/',
  begzod: '/begzod',
  kassir: '/kassir',
  buxgalter: '/buxgalter',
  sardor: '/turizm',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  kassir: 'Finansist',
  begzod: 'Aviakassir',
  buxgalter: 'Buxgalter',
  sardor: 'Turizm',
};

// ===== Authentication =====

const USERS: { username: string; password: string; role: UserRole; name: string }[] = [
  {
    username: process.env.ADMIN_USERNAME ?? '',
    password: process.env.ADMIN_PASSWORD ?? '',
    role: 'admin',
    name: 'Elyor',
  },
  {
    username: process.env.KASSIR_USERNAME ?? '',
    password: process.env.KASSIR_PASSWORD ?? '',
    role: 'kassir',
    name: 'Kassir',
  },
  {
    username: process.env.BEGZOD_USERNAME ?? '',
    password: process.env.BEGZOD_PASSWORD ?? '',
    role: 'begzod',
    name: 'Kassir-Agent',
  },
  {
    username: process.env.BUXGALTER_USERNAME ?? '',
    password: process.env.BUXGALTER_PASSWORD ?? '',
    role: 'buxgalter',
    name: 'Buxgalter',
  },
  {
    username: process.env.SARDOR_USERNAME ?? '',
    password: process.env.SARDOR_PASSWORD ?? '',
    role: 'sardor',
    name: 'Sardor',
  },
].filter((u) => u.username && u.password) as { username: string; password: string; role: UserRole; name: string }[];

export function authenticate(username: string, password: string): AuthUser | null {
  const user = USERS.find((u) => u.username === username && u.password === password);
  if (!user) return null;
  return { username: user.username, role: user.role, name: user.name };
}

// ===== Session Token =====

const AUTH_SECRET = process.env.AUTH_SECRET ?? '';
if (!AUTH_SECRET && typeof window === 'undefined') {
  console.warn('[auth] AUTH_SECRET env variable is not set!');
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 kun

export function createSessionToken(user: AuthUser): string {
  const payload = JSON.stringify({
    username: user.username,
    role: user.role,
    name: user.name,
    secret: AUTH_SECRET,
    ts: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
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
    if (payload.exp && Date.now() > payload.exp) return null;

    return {
      username: payload.username,
      role: payload.role as UserRole,
      name: payload.name,
    };
  } catch {
    return null;
  }
}
