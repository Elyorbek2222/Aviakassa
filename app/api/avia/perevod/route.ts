import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionFromToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getPerevodlar, addPerevod, updatePerevod } from '@/lib/avia-storage';
import { ticketEditRemainingMs, todayStr } from '@/lib/utils';
import { requireRole, requireAuth } from '@/lib/api-auth';
import { validateAmount } from '@/lib/validate';
import { logChange } from '@/lib/audit';
import { AIRLINE_LABELS, PEREVOD_TUR_LABEL, type Perevod, type PerevodTur, type AirlineKey } from '@/types/avia';

const TURLAR: PerevodTur[] = ['aviakompaniya', 'nalog', 'ish_haqi', 'boshqa'];

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    return NextResponse.json({ perevodlar: await getPerevodlar() });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Perevod (bank chiqimi) qo'shish — admin yoki Finansist (kassir).
    const auth = await requireRole(['admin', 'kassir']);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    const tur = String(body.tur || '') as PerevodTur;
    if (!TURLAR.includes(tur)) return NextResponse.json({ error: "Perevod turi noto'g'ri" }, { status: 400 });

    const summaRes = validateAmount(body.summa, 'Summa');
    if (!summaRes.ok) return NextResponse.json({ error: summaRes.error }, { status: 400 });

    // Aviakompaniya perevodida airline majburiy — qaysi kompaniya qarzini kamaytirishini bilish uchun.
    let airline: AirlineKey | undefined;
    let airlineName: string | undefined;
    if (tur === 'aviakompaniya') {
      airline = String(body.airline || '') as AirlineKey;
      if (!airline || !(airline in AIRLINE_LABELS)) {
        return NextResponse.json({ error: 'Aviakompaniyani tanlang' }, { status: 400 });
      }
      airlineName = AIRLINE_LABELS[airline];
    }

    const item: Perevod = {
      id: `PRV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: todayStr(),
      tur,
      summa: summaRes.value,
      airline,
      airlineName,
      izoh: body.izoh || undefined,
    };

    const all = await addPerevod(item);
    const nomi = tur === 'aviakompaniya' ? airlineName : PEREVOD_TUR_LABEL[tur];
    logChange(auth, 'create', 'perevod', item.id, `Perevod: ${nomi} — ${item.summa.toLocaleString('ru-RU')} so'm`, { after: item }).catch(() => {});
    return NextResponse.json({ perevod: item, total: all.length });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// PATCH: mavjud perevodni tahrirlash.
// Ruxsat: admin — istalgan vaqtda; kassir (Finansist) — 48 soat ichida.
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? getSessionFromToken(token) : null;
    if (!user) return NextResponse.json({ error: 'Avtorizatsiya yo\'q' }, { status: 401 });

    const body = await request.json();
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const all = await getPerevodlar();
    const existing = all.find((p) => p.id === id);
    if (!existing) return NextResponse.json({ error: 'Perevod topilmadi' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    const isFinance = user.role === 'kassir';
    if (!isAdmin && !isFinance) {
      return NextResponse.json({ error: 'Tahrirlash huquqi yo\'q' }, { status: 403 });
    }
    if (!isAdmin && ticketEditRemainingMs(existing) <= 0) {
      return NextResponse.json({ error: '48 soatlik tahrirlash muddati tugagan' }, { status: 403 });
    }

    const nextSumma = body.summa !== undefined ? Number(body.summa) : existing.summa;
    const summaRes = validateAmount(nextSumma, 'Summa');
    if (!summaRes.ok) return NextResponse.json({ error: summaRes.error }, { status: 400 });

    const updated: Perevod = {
      ...existing, // id, sana, tur, airline o'zgarmaydi
      summa: summaRes.value,
      izoh: body.izoh ?? existing.izoh,
    };

    await updatePerevod(updated);
    const nomi = updated.tur === 'aviakompaniya' ? updated.airlineName : PEREVOD_TUR_LABEL[updated.tur];
    logChange(user, 'update', 'perevod', updated.id, `Perevod tahrirlandi: ${nomi} — ${updated.summa.toLocaleString('ru-RU')} so'm`, { before: existing, after: updated }).catch(() => {});
    return NextResponse.json({ perevod: updated });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
