import fs from 'fs';
import path from 'path';
import type {
  AviaTicket,
  AviaPayment,
  Inkassatsiya,
  AviaSettings,
  AirlineConfig,
} from '../types/avia';

// ===== Storage directory =====

const DATA_DIR = path.join(process.cwd(), 'data', 'avia');

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filename: string, fallback: T): T {
  ensureDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(filename: string, data: T): void {
  ensureDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ===== Default Settings =====

export const DEFAULT_SETTINGS: AviaSettings = {
  airlines: [
    { key: 'ozhyo', name: "O'zbekiston Havo Yo'llari", komissiya: 7, active: true },
    { key: 'silk_avia', name: 'Silk Avia', komissiya: 5, active: true },
    { key: 'centrum', name: 'Centrum', komissiya: 3, active: true },
    { key: 'don_avia', name: 'Don Avia', komissiya: 0, active: true },
    { key: 'easybooking', name: 'Easybooking', komissiya: 0, active: true },
    { key: 'boshqa', name: 'Boshqa', komissiya: 0, active: true },
  ] as AirlineConfig[],
};

// ===== Tickets =====

export function getTickets(): AviaTicket[] {
  return readJSON<AviaTicket[]>('tickets.json', []);
}

export function addTickets(tickets: AviaTicket[]): AviaTicket[] {
  const existing = getTickets();
  const updated = [...existing, ...tickets];
  writeJSON('tickets.json', updated);
  return updated;
}

export function addSingleTicket(ticket: AviaTicket): AviaTicket[] {
  return addTickets([ticket]);
}

export function clearTickets(): void {
  writeJSON('tickets.json', []);
}

// ===== Payments =====

export function getPayments(): AviaPayment[] {
  return readJSON<AviaPayment[]>('payments.json', []);
}

export function addPayments(payments: AviaPayment[]): AviaPayment[] {
  const existing = getPayments();
  const updated = [...existing, ...payments];
  writeJSON('payments.json', updated);
  return updated;
}

export function addSinglePayment(payment: AviaPayment): AviaPayment[] {
  return addPayments([payment]);
}

export function clearPayments(): void {
  writeJSON('payments.json', []);
}

// ===== Inkassatsiya =====

export function getInkassatsiya(): Inkassatsiya[] {
  return readJSON<Inkassatsiya[]>('inkassatsiya.json', []);
}

export function addInkassatsiya(item: Inkassatsiya): Inkassatsiya[] {
  const existing = getInkassatsiya();
  const updated = [...existing, item];
  writeJSON('inkassatsiya.json', updated);
  return updated;
}

// ===== Settings =====

export function getSettings(): AviaSettings {
  return readJSON<AviaSettings>('settings.json', DEFAULT_SETTINGS);
}

export function updateSettings(settings: AviaSettings): AviaSettings {
  writeJSON('settings.json', settings);
  return settings;
}
