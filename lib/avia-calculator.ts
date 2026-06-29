import type {
  AviaTicket,
  AviaPayment,
  Inkassatsiya,
  AviaSettings,
  AviaKPI,
  AviaSalesPoint,
  AirlineStat,
  AgentStat,
  DebtRecord,
  PartnerDebt,
  AirlineKey,
  PaymentType,
} from '../types/avia';

// ===== Helpers =====

function getKomissiya(airline: AirlineKey, settings: AviaSettings): number {
  const config = settings.airlines.find((a) => a.key === airline);
  return config ? config.komissiya : 0;
}

/**
 * Foyda formula: (sotishNarxi - tarif) + (tarif * komissiya% / 100)
 * = markup profit + airline commission
 */
function calculateFoyda(ticket: AviaTicket, settings: AviaSettings): number {
  const komissiya = getKomissiya(ticket.airline, settings);
  return (ticket.sotishNarxi - ticket.tarif) + (ticket.tarif * komissiya / 100);
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// ===== KPI =====

export function calculateKPI(
  tickets: AviaTicket[],
  payments: AviaPayment[],
  inkassatsiya: Inkassatsiya[],
  settings: AviaSettings
): AviaKPI {
  const today = todayStr();

  const jamiBiletlar = tickets.length;
  const bugunBiletlar = tickets.filter((t) => t.sana === today).length;
  const jamiSotuv = tickets.reduce((sum, t) => sum + t.sotishNarxi, 0);

  // stok = sum(payments) - sum(inkassatsiya)
  const jamiPayments = payments.reduce((sum, p) => sum + p.summa, 0);
  const jamiInkassatsiya = inkassatsiya.reduce((sum, i) => sum + i.summa, 0);
  const stok = jamiPayments - jamiInkassatsiya;

  // Partner debt: sum of ticket tarifs - inkassatsiya per airline
  const partnerDebts = calculatePartnerDebts(tickets, inkassatsiya);
  const jamiQarzdorlik = partnerDebts.reduce((sum, pd) => sum + Math.max(0, pd.qarz), 0);

  // Net profit
  const sofFoyda = tickets.reduce((sum, t) => sum + calculateFoyda(t, settings), 0);

  // Payment breakdown
  const breakdown = calculatePaymentBreakdown(payments);

  // To'liq to'langan biletlar soni (qarz <= 0)
  const settledCount = jamiBiletlar - calculateDebts(tickets, payments).length;

  return {
    jamiBiletlar,
    bugunBiletlar,
    jamiSotuv,
    stok,
    jamiQarzdorlik,
    sofFoyda,
    naqd: breakdown.naqd,
    plastik: breakdown.plastik,
    perechisleniya: breakdown.perechisleniya,
    settledCount,
  };
}

// ===== Sales Trend =====

export function calculateSalesTrend(tickets: AviaTicket[]): AviaSalesPoint[] {
  const map = new Map<string, { sotuv: number; biletlar: number }>();

  for (const ticket of tickets) {
    const existing = map.get(ticket.sana) || { sotuv: 0, biletlar: 0 };
    existing.sotuv += ticket.sotishNarxi;
    existing.biletlar += 1;
    map.set(ticket.sana, existing);
  }

  const points: AviaSalesPoint[] = [];
  for (const [date, data] of map.entries()) {
    points.push({ date, sotuv: data.sotuv, biletlar: data.biletlar });
  }

  // Sort by date ascending
  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

// ===== Airline Stats =====

export function calculateAirlineStats(
  tickets: AviaTicket[],
  settings: AviaSettings
): AirlineStat[] {
  const map = new Map<AirlineKey, { biletlar: number; sotuv: number; foyda: number }>();

  for (const ticket of tickets) {
    const existing = map.get(ticket.airline) || { biletlar: 0, sotuv: 0, foyda: 0 };
    existing.biletlar += 1;
    existing.sotuv += ticket.sotishNarxi;
    existing.foyda += calculateFoyda(ticket, settings);
    map.set(ticket.airline, existing);
  }

  const stats: AirlineStat[] = [];
  for (const [airline, data] of map.entries()) {
    stats.push({ airline, biletlar: data.biletlar, sotuv: data.sotuv, foyda: data.foyda });
  }

  // Sort by sotuv descending
  stats.sort((a, b) => b.sotuv - a.sotuv);
  return stats;
}

// ===== Agent Stats =====

export function calculateAgentStats(
  tickets: AviaTicket[],
  settings: AviaSettings
): AgentStat[] {
  const map = new Map<string, { biletlar: number; sotuv: number; foyda: number }>();

  for (const ticket of tickets) {
    const agent = ticket.agent || 'Noma\'lum';
    const existing = map.get(agent) || { biletlar: 0, sotuv: 0, foyda: 0 };
    existing.biletlar += 1;
    existing.sotuv += ticket.sotishNarxi;
    existing.foyda += calculateFoyda(ticket, settings);
    map.set(agent, existing);
  }

  const stats: AgentStat[] = [];
  for (const [agent, data] of map.entries()) {
    stats.push({ agent, biletlar: data.biletlar, sotuv: data.sotuv, foyda: data.foyda });
  }

  // Sort by sotuv descending
  stats.sort((a, b) => b.sotuv - a.sotuv);
  return stats;
}

// ===== Client Debts =====

export function calculateDebts(
  tickets: AviaTicket[],
  payments: AviaPayment[]
): DebtRecord[] {
  const debts: DebtRecord[] = [];

  for (const ticket of tickets) {
    // Find matching payments: first by biletRaqam, then by yolovchi name
    let matchingPayments: AviaPayment[];

    if (ticket.biletRaqam) {
      matchingPayments = payments.filter((p) => p.biletRaqam === ticket.biletRaqam);
    } else {
      // Match by passenger name (case-insensitive)
      const name = ticket.yolovchi.toLowerCase().trim();
      matchingPayments = payments.filter(
        (p) => p.mijozIsmi.toLowerCase().trim() === name
      );
    }

    const tolangan = matchingPayments.reduce((sum, p) => sum + p.summa, 0);
    const qarz = ticket.sotishNarxi - tolangan;

    if (qarz > 0) {
      debts.push({
        biletRaqam: ticket.biletRaqam,
        mijozIsmi: ticket.yolovchi,
        sotishNarxi: ticket.sotishNarxi,
        tolangan,
        qarz,
        sana: ticket.sana,
        airline: ticket.airline,
        biletId: ticket.id,
      });
    }
  }

  // Sort by qarz descending
  debts.sort((a, b) => b.qarz - a.qarz);
  return debts;
}

// ===== Partner Debts =====

export function calculatePartnerDebts(
  tickets: AviaTicket[],
  inkassatsiya: Inkassatsiya[]
): PartnerDebt[] {
  // Group tickets by airline
  const ticketsByAirline = new Map<AirlineKey, { summa: number; count: number }>();
  for (const ticket of tickets) {
    const existing = ticketsByAirline.get(ticket.airline) || { summa: 0, count: 0 };
    existing.summa += ticket.tarif; // Partner debt is based on tarif (prixod), not sotish narxi
    existing.count += 1;
    ticketsByAirline.set(ticket.airline, existing);
  }

  // Group inkassatsiya by airline
  const inkByAirline = new Map<AirlineKey, number>();
  for (const ink of inkassatsiya) {
    const existing = inkByAirline.get(ink.airline) || 0;
    inkByAirline.set(ink.airline, existing + ink.summa);
  }

  // Combine all airlines from both maps
  const allAirlines = new Set<AirlineKey>([
    ...ticketsByAirline.keys(),
    ...inkByAirline.keys(),
  ]);

  const debts: PartnerDebt[] = [];
  for (const airline of allAirlines) {
    const ticketData = ticketsByAirline.get(airline) || { summa: 0, count: 0 };
    const inkSum = inkByAirline.get(airline) || 0;

    debts.push({
      airline,
      biletlarSumma: ticketData.summa,
      inkassatsiya: inkSum,
      qarz: ticketData.summa - inkSum,
      biletlar: ticketData.count,
    });
  }

  // Sort by qarz descending
  debts.sort((a, b) => b.qarz - a.qarz);
  return debts;
}

// ===== Payment Breakdown =====

export function calculatePaymentBreakdown(
  payments: AviaPayment[]
): { naqd: number; plastik: number; perechisleniya: number } {
  const result = { naqd: 0, plastik: 0, perechisleniya: 0 };

  for (const payment of payments) {
    const key: PaymentType = payment.tolovTuri;
    if (key in result) {
      result[key] += payment.summa;
    }
  }

  return result;
}
