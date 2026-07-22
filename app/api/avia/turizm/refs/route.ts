import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getSuppliers, getCurrencies, getCashboxes, getPaymentForms, getManagers, hasUonKey } from '@/lib/uon';

// Turizm formasi dropdownlari — U-ON'dan (partnyorlar, valyuta, kassa, to'lov shakli).
// Har biri alohida try/catch: bittasi ishlamasa ham qolganlari kelaveradi.
export async function GET() {
  const auth = await requireRole(['admin', 'sardor']);
  if (auth instanceof NextResponse) return auth;

  if (!hasUonKey()) {
    return NextResponse.json({ error: 'U-ON API kaliti sozlanmagan (UON_API_KEY)', suppliers: [], currencies: [], cashboxes: [], forms: [], managers: [] }, { status: 200 });
  }

  const [suppliers, currencies, cashboxes, forms, managers] = await Promise.all([
    getSuppliers().catch(() => []),
    getCurrencies().catch(() => []),
    getCashboxes().catch(() => []),
    getPaymentForms().catch(() => []),
    getManagers().catch(() => []),
  ]);

  return NextResponse.json({ suppliers, currencies, cashboxes, forms, managers });
}
