import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format money in short form: 1.2 mlrd, 45.3 mln, 120 ming, 5 600
 */
export function formatMoney(n: number): string {
  if (n === 0) return '0';

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000;
    return sign + (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + ' mlrd';
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    return sign + (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + ' mln';
  }
  if (abs >= 1_000) {
    const val = abs / 1_000;
    return sign + (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + ' ming';
  }
  return sign + abs.toLocaleString('uz-UZ');
}

/**
 * Format full money with locale separators: "1 234 567 so'm"
 */
export function formatFullMoney(n: number): string {
  return n.toLocaleString('uz-UZ') + " so'm";
}
