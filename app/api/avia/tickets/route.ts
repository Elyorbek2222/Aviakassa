import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionFromToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getTickets, addSingleTicket, clearTickets, updateTicket } from '@/lib/avia-storage';
import { appendToSheet } from '@/lib/gsheet';
import { ticketEditRemainingMs, todayStr } from '@/lib/utils';
import { requireRole } from '@/lib/api-auth';
import { validateTicket } from '@/lib/validate';
import { AIRLINE_LABELS, type AviaTicket, type AirlineKey } from '@/types/avia';

// GET: return tickets with optional filters
export async function GET(request: NextRequest) {
  try {
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
    const { biletRaqam, yolovchi, tarif, sotishNarxi, passengerCount } = valid.value;

    const airlineKey = body.airline as AirlineKey;
    const airlineName = AIRLINE_LABELS[airlineKey] || body.airlineName || '';

    const existing = await getTickets();

    // Dublikat: bir xil bilet raqami + yo'lovchi. allowDuplicate bilan majburan
    // qo'shsa bo'ladi (qayta rasmlashtirish holati uchun).
    if (!body.allowDuplicate) {
      const dup = existing.some(
        (t) => t.biletRaqam === biletRaqam && t.yolovchi.trim().toLowerCase() === yolovchi.toLowerCase()
      );
      if (dup) {
        return NextResponse.json(
          { error: "Bu bilet raqami va yo'lovchi allaqachon kiritilgan", duplicate: true },
          { status: 409 }
        );
      }
    }

    const ticket: AviaTicket = {
      id: `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: today,
      airline: airlineKey,
      airlineName,
      biletRaqam,
      yolovchi,
      passengerCount,
      tarif,
      sotishNarxi,
      izoh: body.izoh,
      agent: agentName,
    };

    const tickets = await addSingleTicket(ticket);

    // Google Sheets'ga ham yozish (asinxron — kutmaymiz)
    const airlineCols = { uzairways: 1, silk_avia: 2, centrum: 3, don_avia: 4, easybooking: 5, boshqa: 6 };
    const row: (string | number)[] = [today, '', '', '', '', '', '', '', biletRaqam, yolovchi, tarif, sotishNarxi, agentName];
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
      ...existing, // id, sana, agent o'zgarmaydi
      airline: airlineKey,
      airlineName: AIRLINE_LABELS[airlineKey] || body.airlineName || existing.airlineName,
      biletRaqam: body.biletRaqam ?? existing.biletRaqam,
      yolovchi: body.yolovchi ?? existing.yolovchi,
      passengerCount: body.passengerCount ?? existing.passengerCount,
      tarif: body.tarif !== undefined ? Number(body.tarif) : existing.tarif,
      sotishNarxi: body.sotishNarxi !== undefined ? Number(body.sotishNarxi) : existing.sotishNarxi,
      izoh: body.izoh ?? existing.izoh,
    };

    const valid = validateTicket(updated as unknown as Record<string, unknown>);
    if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });

    await updateTicket(updated);
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
    return NextResponse.json({ message: 'Barcha biletlar tozalandi' });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
