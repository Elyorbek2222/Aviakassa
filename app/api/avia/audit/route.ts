import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getAudit } from '@/lib/audit';

// GET: audit jurnali (faqat admin). Filtrlar: entity, actor, action, from, to, limit.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get('limit');
    const limit = limitRaw ? Number(limitRaw) : 200;

    const entries = await getAudit({
      entity: searchParams.get('entity') || undefined,
      actor: searchParams.get('actor') || undefined,
      action: searchParams.get('action') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      limit: Number.isFinite(limit) ? limit : 200,
    });

    return NextResponse.json({ audit: entries });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
