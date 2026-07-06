import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionFromToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getTickets, addSingleTicket, clearTickets, updateTicket } from '@/lib/avia-storage';
import { appendToSheet } from '@/lib/gsheet';
import { ticketEditRemainingMs, todayStr } from '@/lib/utils';
import { requireRole, requireAuth } from '@/lib/api-auth';
import { validateTicket } from '@/lib/validate';
import { logChange } from '@/lib/audit';
import { AIRLINE_LABELS, type AviaTicket, type AirlineKey } from '@/types/avia';

// GET: return tickets with optional filters
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get('agent');
    const airline = searchParams.get('airline');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');
    const biletRaqam = searchParams.get('biletRaqam');

    let tickets = await getTickets();

    if (biletRaqam) {
      tickets = tickets.filter((t) => t.biletRaqam === biletRaqam);
    }
    if (agent) {
      tickets = tickets.filter((t) => t.agent === agent);
    }
    if (airline) {
      tickets = tickets.filter((t) => t.airline === airline);
    }
    if (from) {
      tickets = tickets.filter((t) => t.sana >= from);
    }
    if (to) {
      tickets = tickets.filter((t) => t.sana <= to);
    }
    if (search) {
      const q = search.toLowerCase();
      tickets = tickets.filter(
        (t) =>
          t.yolovchi.toLowerCase().includes(q) ||
          t.biletRaqam.toLowerCase().includes(q) ||
          t.airlineName.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ tickets });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// POST: add single ticket from form
export async function POST(request: NextRequest) {
  try {
    // Bilet yozish — admin yoki aviakassir (begzod). Agent nomi sessiyadan olinadi.
    const auth = await requireRole(['admin', 'begzod']);
    if (auth instanceof NextResponse) return auth;
    const agentName = auth.name;

    const body = await request.json();
    const today = todayStr();

    // Validatsiya — xato summa jimgina 0 ga aylanmasin
    const valid = validateTicket(body);
    if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
    const { biletRaqam, yolovchi, tarif, sotishNarxi, passengerCount, sana: saleSana, qoshimchaFoyda, qoshimchaIzoh } = valid.value;

    const airlineKey = body.airline as AirlineKey;
    const airlineName = AIRLINE_LABELS[airlineKey] || body.airlineName || '';

    const existing = await getTickets();

    // Dublikat: bir xil bilet RAQAMI bo'yicha (bilet raqami yagona bo'lishi kerak).
    // Yo'lovchi ismi imlosi/probel/registri farq qilsa ham aynan shu bilet ikki
    // marta kirmasin. allowDuplicate bilan majburan qo'shsa bo'ladi (reissue uchun).
    // Blok faqat PULLIK biletga (sotishNarxi > 0) — ikki marta daromad yozilmasin.
    // 0 summali bilet (reissue / bepul / mil) bir xil raqam bilan bemalol qo'shiladi.
    if (!body.allowDuplicate && sotishNarxi > 0) {
      // Chiziqcha/probel farqi dublikatni yashirmasin: 250-2118677279 === 2502118677279
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dupTicket = existing.find((t) => norm(t.biletRaqam) === norm(biletRaqam));
      if (dupTicket) {
        return NextResponse.json(
          { error: `Bu bilet raqami allaqachon kiritilgan: ${biletRaqam} (${dupTicket.yolovchi})`, duplicate: true },
          { status: 409 }
        );
      }
    }

    const ticket: AviaTicket = {
      id: `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: saleSana || today, // berilsa — sotuv sanasi (orqaga), aks holda bugun
      airline: airlineKey,
      airlineName,
      biletRaqam,
      yolovchi,
      passengerCount,
      tarif,
      sotishNarxi,
      izoh: body.izoh,
      agent: agentName,
      qoshimchaFoyda,
      qoshimchaIzoh,
    };

    const tickets = await addSingleTicket(ticket);

    logChange(auth, 'create', 'ticket', ticket.id, `Bilet qo'shildi: ${ticket.biletRaqam} — ${ticket.yolovchi}`, { after: ticket }).catch(() => {});

    // Google Sheets'ga ham yozish (asinxron — kutmaymiz)
    const airlineCols = { uzairways: 1, silk_avia: 2, centrum: 3, don_avia: 4, easybooking: 5, boshqa: 6 };
    const row: (string | number)[] = [ticket.sana, '', '', '', '', '', '', '', biletRaqam, yolovchi, tarif, sotishNarxi, agentName];
    const colIdx = airlineCols[airlineKey] ?? 6;
    row[colIdx] = tarif;
    if (airlineKey === 'boshqa') row[7] = airlineName;
    appendToSheet('Biletlar', row).catch(() => {});

    return NextResponse.json({ ticket, total: tickets.length });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// PATCH: edit an existing ticket.
// Ruxsat: admin — istalgan vaqtda; begzod (aviakassir) — faqat O'Z bileti va
// yaratilgandan 48 soat ichida. Boshqalar — taqiqlangan.
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? getSessionFromToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Avtorizatsiya yo\'q' }, { status: 401 });
    }

    const body = await request.json();
    const id = String(body.id || '');
    if (!id) {
      return NextResponse.json({ error: 'id kerak' }, { status: 400 });
    }

    const tickets = await getTickets();
    const existing = tickets.find((t) => t.id === id);
    if (!existing) {
      return NextResponse.json({ error: 'Bilet topilmadi' }, { status: 404 });
    }

    const isAdmin = user.role === 'admin';
    const isOwnerAgent = user.role === 'begzod' && existing.agent === user.name;
    if (!isAdmin && !isOwnerAgent) {
      return NextResponse.json({ error: 'Bu biletni tahrirlash huquqi yo\'q' }, { status: 403 });
    }
    // Aviakassir uchun 48 soatlik muddat (admin uchun cheklov yo'q)
    if (!isAdmin && ticketEditRemainingMs(existing) <= 0) {
      return NextResponse.json({ error: '48 soatlik tahrirlash muddati tugagan' }, { status: 403 });
    }

    const airlineKey = (body.airline as AirlineKey) ?? existing.airline;
    const updated: AviaTicket = {
      ...existing, // id, agent o'zgarmaydi (sana tahrirlanishi mumkin)
      airline: airlineKey,
      airlineName: AIRLINE_LABELS[airlineKey] || body.airlineName || existing.airlineName,
      biletRaqam: body.biletRaqam ?? existing.biletRaqam,
      yolovchi: body.yolovchi ?? existing.yolovchi,
      passengerCount: body.passengerCount ?? existing.passengerCount,
      tarif: body.tarif !== undefined ? Number(body.tarif) : existing.tarif,
      sotishNarxi: body.sotishNarxi !== undefined ? Number(body.sotishNarxi) : existing.sotishNarxi,
      izoh: body.izoh ?? existing.izoh,
      sana: body.sana ? String(body.sana) : existing.sana,
      qoshimchaFoyda:
        body.qoshimchaFoyda !== undefined
          ? (body.qoshimchaFoyda === '' || body.qoshimchaFoyda === null ? undefined : Number(body.qoshimchaFoyda))
          : existing.qoshimchaFoyda,
      qoshimchaIzoh:
        body.qoshimchaIzoh !== undefined
          ? (String(body.qoshimchaIzoh).trim() || undefined)
          : existing.qoshimchaIzoh,
    };

    const valid = validateTicket(updated as unknown as Record<string, unknown>);
    if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });

    await updateTicket(updated);
    logChange(user, 'update', 'ticket', updated.id, `Bilet tahrirlandi: ${updated.biletRaqam}`, { before: existing, after: updated }).catch(() => {});
    return NextResponse.json({ ticket: updated });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// DELETE: clear all tickets (admin only)
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? getSessionFromToken(token) : null;
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }
    await clearTickets();
    logChange(user, 'clear', 'ticket', '', 'Barcha biletlar tozalandi').catch(() => {});
    return NextResponse.json({ message: 'Barcha biletlar tozalandi' });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
