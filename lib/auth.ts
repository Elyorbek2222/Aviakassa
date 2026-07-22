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
  admin: ['/', '/tickets', '/payments', '/debts', '/inkassatsiya', '/upload', '/otchot', '/prixot', '/turizm', '/turizm/kassa', '/turizm/hisobot', '/settings', '/audit', '/qollanma', '/kassir', '/begzod', '/begzod/royxat', '/begzod/refund', '/begzod/debts', '/buxgalter'],
  begzod: ['/begzod', '/begzod/royxat', '/begzod/refund', '/begzod/debts', '/otchot', '/qollanma'],
  kassir: ['/kassir', '/tickets', '/debts', '/otchot', '/qollanma'],
  buxgalter: ['/buxgalter', '/otchot', '/qollanma'],
  sardor: ['/turizm', '/turizm/kassa', '/turizm/hisobot', '/qollanma'],
};

export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/',
  begzod: '/begzod',
  kassir: '/kassir',
  buxgalter: '/buxgalter',
  sardor: '/turizm',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Elyor',
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
//
// Token = `<payloadB64>.<hmacHex>` — payload HMAC-SHA256 bilan imzolanadi.
// AUTH_SECRET IMZO KALITI: hech qachon token ichiga yozilmaydi (faqat serverda
// qoladi). Shu sabab token o'g'irlansa ham undan kalitni tiklab bo'lmaydi va
// boshqa rol uchun (masalan admin) token soxtalashtirib bo'lmaydi.
//
// HMAC sof-JS bilan yozilgan — proxy (Edge runtime)da `node:crypto` yo'q, lekin
// bu funksiyalar sinxron bo'lib qolishi kerak (proxy va ~15 route sinxron chaqiradi).
// To'g'riligi node:crypto ga qarshi 5000 tasodifiy kirishda tekshirilgan.
// Known-answer: HMAC-SHA256("key","The quick brown fox jumps over the lazy dog")
//   = f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8

const AUTH_SECRET = process.env.AUTH_SECRET ?? '';
if (!AUTH_SECRET && typeof window === 'undefined') {
  // Fail-closed: kalitsiz token yaratib/tekshirib bo'lmaydi (pastdagi funksiyalar
  // throw/null qaytaradi) — soxta token bilan kirishning oldi olinadi.
  console.error('[auth] AUTH_SECRET env variable is not set — sessiyalar ishlamaydi!');
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 kun

// --- Sof-JS SHA-256 / HMAC-SHA256 (Edge + Node'da ishlaydi, sinxron) ---
const SHA_K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
]);
const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

function sha256(msg: Uint8Array): Uint8Array {
  const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const l = msg.length;
  const bitLen = l * 8;
  const withOne = l + 1;
  const pad = (56 - (withOne % 64) + 64) % 64;
  const total = withOne + pad + 8;
  const buf = new Uint8Array(total);
  buf.set(msg);
  buf[l] = 0x80;
  const hi = Math.floor(bitLen / 0x100000000);
  const lo = bitLen >>> 0;
  buf[total-8]=(hi>>>24)&0xff; buf[total-7]=(hi>>>16)&0xff; buf[total-6]=(hi>>>8)&0xff; buf[total-5]=hi&0xff;
  buf[total-4]=(lo>>>24)&0xff; buf[total-3]=(lo>>>16)&0xff; buf[total-2]=(lo>>>8)&0xff; buf[total-1]=lo&0xff;
  const w = new Uint32Array(64);
  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t++)
      w[t] = ((buf[i+4*t]<<24) | (buf[i+4*t+1]<<16) | (buf[i+4*t+2]<<8) | buf[i+4*t+3]) >>> 0;
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t-15],7) ^ rotr(w[t-15],18) ^ (w[t-15] >>> 3);
      const s1 = rotr(w[t-2],17) ^ rotr(w[t-2],19) ^ (w[t-2] >>> 10);
      w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
    }
    let a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA_K[t] + w[t]) >>> 0;
      const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h=g; g=f; f=e; e=(d+temp1)>>>0; d=c; c=b; b=a; a=(temp1+temp2)>>>0;
    }
    H[0]=(H[0]+a)>>>0;H[1]=(H[1]+b)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;
    H[4]=(H[4]+e)>>>0;H[5]=(H[5]+f)>>>0;H[6]=(H[6]+g)>>>0;H[7]=(H[7]+h)>>>0;
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[4*i]=(H[i]>>>24)&0xff; out[4*i+1]=(H[i]>>>16)&0xff; out[4*i+2]=(H[i]>>>8)&0xff; out[4*i+3]=H[i]&0xff;
  }
  return out;
}

function hmacSha256Hex(key: string, msg: string): string {
  const enc = new TextEncoder();
  let k: Uint8Array = enc.encode(key);
  const BLOCK = 64;
  if (k.length > BLOCK) k = sha256(k);
  const kp = new Uint8Array(BLOCK); kp.set(k);
  const ipad = new Uint8Array(BLOCK), opad = new Uint8Array(BLOCK);
  for (let i = 0; i < BLOCK; i++) { ipad[i] = kp[i] ^ 0x36; opad[i] = kp[i] ^ 0x5c; }
  const m = enc.encode(msg);
  const inner = new Uint8Array(BLOCK + m.length); inner.set(ipad); inner.set(m, BLOCK);
  const innerHash = sha256(inner);
  const outer = new Uint8Array(BLOCK + 32); outer.set(opad); outer.set(innerHash, BLOCK);
  return Array.from(sha256(outer)).map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Doimiy vaqtli taqqoslash (imzo bo'yicha timing sizib chiqmasin).
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function createSessionToken(user: AuthUser): string {
  if (!AUTH_SECRET) throw new Error('AUTH_SECRET sozlanmagan — token yaratib bo\'lmaydi');
  const payloadB64 = Buffer.from(JSON.stringify({
    username: user.username,
    role: user.role,
    name: user.name,
    ts: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  })).toString('base64');
  const sig = hmacSha256Hex(AUTH_SECRET, payloadB64);
  return `${payloadB64}.${sig}`;
}

export function getSessionFromToken(token: string): AuthUser | null {
  try {
    if (!AUTH_SECRET) return null; // fail-closed: kalitsiz hech qanday token yaroqli emas
    const dot = token.indexOf('.');
    if (dot === -1) return null;
    const payloadB64 = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = hmacSha256Hex(AUTH_SECRET, payloadB64);
    if (!timingSafeEqual(sig, expected)) return null; // imzo mos emas — soxta/buzilgan

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'));
    if (!payload.username || !payload.role || !payload.name) return null;
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
