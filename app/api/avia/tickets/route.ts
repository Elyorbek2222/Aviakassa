import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionFromToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getTickets, addSingleTicket, clearTickets } from '@/lib/avia-storage';
import { appendToSheet } from '@/lib/gsheet';
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
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    let agentName = 'Admin';

    if (sessionCookie?.value) {
      const user = getSessionFromToken(sessionCookie.value);
      if (user) {
        agentName = user.name;
      }
    }

    const body = await request.json();
    const today = new Date().toISOString().split('T')[0];

    const airlineKey = body.airline as AirlineKey;
    const airlineName = AIRLINE_LABELS[airlineKey] || body.airlineName || '';
    const tarif = Number(body.tarif) || 0;
    const sotishNarxi = Number(body.sotishNarxi) || 0;

    const ticket: AviaTicket = {
      id: `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sana: today,
      airline: airlineKey,
      airlineName,
      biletRaqam: body.biletRaqam,
      yolovchi: body.yolovchi,
      passengerCount: body.passengerCount || 1,
      tarif,
      sotishNarxi,
      izoh: body.izoh,
      agent: agentName,
    };

    const tickets = await addSingleTicket(ticket);

    // Google Sheets'ga ham yozish (asinxron — kutmaymiz)
    const airlineCols = { uzairways: 1, silk_avia: 2, centrum: 3, don_avia: 4, easybooking: 5, boshqa: 6 };
    const row: (string | number)[] = [today, '', '', '', '', '', '', '', body.biletRaqam, body.yolovchi, tarif, sotishNarxi, agentName];
    const colIdx = airlineCols[airlineKey] ?? 6;
    row[colIdx] = tarif;
    if (airlineKey === 'boshqa') row[7] = airlineName;
    appendToSheet('Biletlar', row).catch(() => {});

    return NextResponse.json({ ticket, total: tickets.length });
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
