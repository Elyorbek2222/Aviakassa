import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/avia-storage';
import { requireRole, requireAuth } from '@/lib/api-auth';
import { validateKomissiya } from '@/lib/validate';
import { logChange } from '@/lib/audit';
import type { AviaSettings } from '@/types/avia';

// GET: return settings
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// PUT: update settings
export async function PUT(request: NextRequest) {
  try {
    // Komissiya sozlamalari butun foyda hisobiga ta'sir qiladi — faqat admin.
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json() as AviaSettings;
    if (!body || !Array.isArray(body.airlines)) {
      return NextResponse.json({ error: "Sozlamalar noto'g'ri" }, { status: 400 });
    }
    for (const a of body.airlines) {
      const kom = validateKomissiya(a.komissiya);
      if (!kom.ok) return NextResponse.json({ error: `${a.name || a.key}: ${kom.error}` }, { status: 400 });
    }

    const updated = await updateSettings(body);
    logChange(auth, 'update', 'settings', 'default', 'Aviakompaniya sozlamalari yangilandi', { after: updated }).catch(() => {});
    return NextResponse.json({ settings: updated });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
