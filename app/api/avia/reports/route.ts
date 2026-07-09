import { NextRequest, NextResponse } from 'next/server';
import { getTickets, getPayments, getInkassatsiya, getRasxodlar, getRefundlar, getSettings, getObmenlar, getPerevodlar } from '@/lib/avia-storage';
import { todayStr } from '@/lib/utils';
import { requireAuth } from '@/lib/api-auth';
import type {
  AviaKPI,
  AviaSalesPoint,
  AirlineStat,
  AgentStat,
  DebtRecord,
  PartnerDebt,
  AirlineKey,
  PaymentType,
} from '@/types/avia';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const agentFilter = searchParams.get('agent');
    const airlineFilter = searchParams.get('airline');

    // Barcha manbalarni PARALLEL o'qiymiz — ilgari 6 so'rov ketma-ket edi
    // (~6× sekin). Endi eng sekin bitta so'rov vaqtiga tushadi.
    const [settings, ...rest] = await Promise.all([
      getSettings(),
      getTickets(),
      getPayments(),
      getInkassatsiya(),
      getRasxodlar(),
      getRefundlar(),
      getObmenlar(),
      getPerevodlar(),
    ]);
    // Quyidagilar sana/agent/aviakompaniya filtrlari bilan qayta tayinlanadi.
    let [tickets, payments, inkassatsiya, rasxodlar, refundlar, obmenlar, perevodlar] = rest;

    // Apply date filters
    if (from) {
      tickets = tickets.filter((t) => t.sana >= from);
      payments = payments.filter((p) => p.sana >= from);
      inkassatsiya = inkassatsiya.filter((i) => i.sana >= from);
      rasxodlar = rasxodlar.filter((r) => r.sana >= from);
      refundlar = refundlar.filter((r) => r.sana >= from);
      obmenlar = obmenlar.filter((o) => o.sana >= from);
      perevodlar = perevodlar.filter((p) => p.sana >= from);
    }
    if (to) {
      tickets = tickets.filter((t) => t.sana <= to);
      payments = payments.filter((p) => p.sana <= to);
      inkassatsiya = inkassatsiya.filter((i) => i.sana <= to);
      rasxodlar = rasxodlar.filter((r) => r.sana <= to);
      refundlar = refundlar.filter((r) => r.sana <= to);
      obmenlar = obmenlar.filter((o) => o.sana <= to);
      perevodlar = perevodlar.filter((p) => p.sana <= to);
    }
    if (agentFilter) {
      tickets = tickets.filter((t) => t.agent === agentFilter);
    }
    if (airlineFilter) {
      tickets = tickets.filter((t) => t.airline === airlineFilter);
    }

    const today = todayStr();

    // KPI calculations
    const bugunBiletlar = tickets.filter((t) => t.sana === today).length;
    const jamiSotuv = tickets.reduce((s, t) => s + t.sotishNarxi, 0);

    // Kassa modeli — Excel OSTATOK bilan bir xil (kassir hisobot varag'i):
    //   NAQD kassa (stok): naqd + obmen(so'm) − inkassatsiya − rasxod − refund
    //   USD kassa: USD to'lovlar − obmen(USD)
    //   Plastik / perechisleniya BANKKA boradi — naqd kassaga KIRMAYDI (alohida).
    // USD to'lovning so'm-ekvivalenti (p.summa) ham naqd kassaga qo'shilmaydi —
    // dollar alohida yotadi va faqat obmen orqali so'mga aylanadi.
    const uzsPay = payments.filter((p) => p.valyuta !== 'usd');
    const byType = (tt: PaymentType) => uzsPay.filter((p) => p.tolovTuri === tt).reduce((s, p) => s + p.summa, 0);
    const naqd = byType('naqd');
    const plastik = byType('plastik');
    const perechisleniya = byType('perechisleniya');
    const bankUzs = plastik + perechisleniya; // karta + o'tkazma (bank) — naqd kassadan tashqarida
    const obmenUzs = obmenlar.reduce((s, o) => s + o.uzsSumma, 0); // obmen so'mga kirim
    const obmenUsd = obmenlar.reduce((s, o) => s + o.usdSumma, 0); // obmen USD chiqim
    const usdKirim = payments.reduce((s, p) => s + (p.valyuta === 'usd' ? (p.summAsl || 0) : 0), 0);
    const jamiInkassatsiya = inkassatsiya.reduce((s, i) => s + i.summa, 0);
    const jamiRasxod = rasxodlar.reduce((s, r) => s + r.summa, 0);
    const jamiRefund = refundlar.reduce((s, r) => s + r.summa, 0);
    const stok = naqd + obmenUzs - jamiInkassatsiya - jamiRasxod - jamiRefund;
    const usdKassa = usdKirim - obmenUsd; // qolgan dollar

    // Bank hisobi (schet): plastik + perechisleniya bankka to'g'ridan-to'g'ri tushadi,
    // naqddan "Kassa topshirish" (inkassatsiya turi='kassa') bankka o'tkaziladi,
    // perevodlar esa bankdan chiqadi (aviaga/nalog/ish haqi/boshqa).
    const jamiKassaTopshirish = inkassatsiya.filter((i) => i.turi === 'kassa').reduce((s, i) => s + i.summa, 0);
    const jamiPerevod = perevodlar.reduce((s, p) => s + p.summa, 0);
    const bankBalans = bankUzs + jamiKassaTopshirish - jamiPerevod;

    // Foyda = (sotish - tarif) + (tarif * komissiya%) + qo'shimcha foyda — har bilet uchun
    const sofFoyda = tickets.reduce((s, t) => {
      const usluga = t.sotishNarxi - t.tarif;
      const config = settings.airlines.find((a) => a.key === t.airline);
      const komissiya = t.tarif * ((config?.komissiya ?? 0) / 100);
      return s + usluga + komissiya + (t.qoshimchaFoyda ?? 0);
    }, 0);
    // Shundan Begzodning alohida kiritgan ekstra foydasi (alohida ko'rsatish uchun)
    const jamiQoshimchaFoyda = tickets.reduce((s, t) => s + (t.qoshimchaFoyda ?? 0), 0);

    // Partner debts (airline-level)
    const airlineMap = new Map<AirlineKey, { biletlarSumma: number; inkassatsiya: number; biletlar: number }>();
    for (const t of tickets) {
      const existing = airlineMap.get(t.airline) || { biletlarSumma: 0, inkassatsiya: 0, biletlar: 0 };
      existing.biletlarSumma += t.tarif;
      existing.biletlar += 1;
      airlineMap.set(t.airline, existing);
    }
    for (const i of inkassatsiya) {
      if (i.turi === 'kassa') continue; // kunlik kassa topshirish — partnyor qarziga aloqasi yo'q
      const existing = airlineMap.get(i.airline) || { biletlarSumma: 0, inkassatsiya: 0, biletlar: 0 };
      existing.inkassatsiya += i.summa;
      airlineMap.set(i.airline, existing);
    }
    // Aviakompaniyaga perevod ham o'sha kompaniya qarzini kamaytiradi (inkassatsiya kabi).
    for (const p of perevodlar) {
      if (p.tur !== 'aviakompaniya' || !p.airline) continue;
      const existing = airlineMap.get(p.airline) || { biletlarSumma: 0, inkassatsiya: 0, biletlar: 0 };
      existing.inkassatsiya += p.summa;
      airlineMap.set(p.airline, existing);
    }

    const partnerDebts: PartnerDebt[] = [];
    let jamiQarzdorlik = 0;
    for (const [airline, data] of airlineMap) {
      const qarz = data.biletlarSumma - data.inkassatsiya;
      if (Math.abs(qarz) > 0 || data.biletlar > 0) {
        partnerDebts.push({
          airline,
          biletlarSumma: data.biletlarSumma,
          inkassatsiya: data.inkassatsiya,
          qarz,
          biletlar: data.biletlar,
        });
      }
      if (qarz > 0) jamiQarzdorlik += qarz;
    }

    // Customer debts (bilet-level: sotishNarxi - tolangan).
    // Faqat bilet raqami BOR to'lovlar bilet-qarziga bog'lanadi. Bo'sh raqamli
    // to'lovlar (masalan "Obmen") mijoz qarziga hisoblanmaydi — aks holda bo'sh
    // raqamli biletlar bir-birining/obmenning summasini "to'langan" deb olardi.
    const paymentsByTicket = new Map<string, number>();
    for (const p of payments) {
      if (!p.biletRaqam) continue;
      paymentsByTicket.set(p.biletRaqam, (paymentsByTicket.get(p.biletRaqam) || 0) + p.summa);
    }

    const debts: DebtRecord[] = [];
    let settledCount = 0;
    for (const t of tickets) {
      const tolangan = t.biletRaqam ? (paymentsByTicket.get(t.biletRaqam) || 0) : 0;
      const qarz = t.sotishNarxi - tolangan;
      if (qarz > 0) {
        debts.push({
          biletRaqam: t.biletRaqam,
          mijozIsmi: t.yolovchi,
          sotishNarxi: t.sotishNarxi,
          tolangan,
          qarz,
          sana: t.sana,
          airline: t.airline,
          biletId: t.id,
          izoh: t.izoh || '',
        });
      } else {
        settledCount += 1; // to'liq to'langan bilet
      }
    }

    // Sales trend (daily)
    const salesByDate = new Map<string, { sotuv: number; biletlar: number }>();
    for (const t of tickets) {
      const existing = salesByDate.get(t.sana) || { sotuv: 0, biletlar: 0 };
      existing.sotuv += t.sotishNarxi;
      existing.biletlar += 1;
      salesByDate.set(t.sana, existing);
    }
    const salesTrend: AviaSalesPoint[] = Array.from(salesByDate.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Airline stats
    const airlineStatsMap = new Map<AirlineKey, { biletlar: number; sotuv: number; foyda: number }>();
    for (const t of tickets) {
      const existing = airlineStatsMap.get(t.airline) || { biletlar: 0, sotuv: 0, foyda: 0 };
      existing.biletlar += 1;
      existing.sotuv += t.sotishNarxi;
      const cfg = settings.airlines.find((a) => a.key === t.airline);
      existing.foyda += (t.sotishNarxi - t.tarif) + t.tarif * ((cfg?.komissiya ?? 0) / 100) + (t.qoshimchaFoyda ?? 0);
      airlineStatsMap.set(t.airline, existing);
    }
    const airlineStats: AirlineStat[] = Array.from(airlineStatsMap.entries()).map(
      ([airline, data]) => ({ airline, ...data })
    );

    // Agent stats
    const agentStatsMap = new Map<string, { biletlar: number; sotuv: number; foyda: number }>();
    for (const t of tickets) {
      const existing = agentStatsMap.get(t.agent) || { biletlar: 0, sotuv: 0, foyda: 0 };
      existing.biletlar += 1;
      existing.sotuv += t.sotishNarxi;
      const acfg = settings.airlines.find((a) => a.key === t.airline);
      existing.foyda += (t.sotishNarxi - t.tarif) + t.tarif * ((acfg?.komissiya ?? 0) / 100) + (t.qoshimchaFoyda ?? 0);
      agentStatsMap.set(t.agent, existing);
    }
    const agentStats: AgentStat[] = Array.from(agentStatsMap.entries()).map(
      ([agent, data]) => ({ agent, ...data })
    );

    // Payment breakdown
    const paymentBreakdown: Record<PaymentType, number> = {
      naqd,
      plastik,
      perechisleniya,
    };

    const kpi: AviaKPI = {
      jamiBiletlar: tickets.length,
      bugunBiletlar,
      jamiSotuv,
      stok,
      usdKassa,
      bankUzs,
      bankBalans,
      jamiPerevod,
      jamiQarzdorlik,
      sofFoyda,
      qoshimchaFoyda: jamiQoshimchaFoyda,
      naqd,
      plastik,
      perechisleniya,
      settledCount,
    };

    return NextResponse.json({
      kpi,
      salesTrend,
      airlineStats,
      agentStats,
      debts,
      partnerDebts,
      paymentBreakdown,
    });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
