import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { requireRole } from '@/lib/api-auth';
import { listZayavki } from '@/lib/uon';
import { todayStr } from '@/lib/utils';
import type { HisobotZayavka, TurizmHisobot } from '@/types/avia';

// Turizm hisobotlari — U-ON zayavkalaridan jonli hisoblanadi (3 ta hisobot):
//  A) Kutilayotgan: xizmat sanasi hali kelmagan.
//  B) Partnyorga o'tkazilmagan: mijoz to'lagan, lekin partnyorga o'tkazilmagan.
//  C1) Mijoz bizga qarz: o'tgan sana + mijoz to'liq to'lamagan.
//  C2) Biz partnyorga qarz: partnyor tannarxidan kam to'langan.
// Qarz summasi calc maydonlaridan hisoblanadi (to'lov belgisi qo'lda, ishonchsiz).

const TOL = 100_000; // 100k so'm — yaxlitlash/shovqin ostonasi
const DEAD = new Set([3, 4]); // Отказ, Аннулирована — chiqarib tashlanadi

// Bugundan 24 oy oldingi sana (Y-m-d) — qamrov boshi. Qarzlar eski
// zayavkalarda ham qolishi mumkin, shuning uchun 2 yil orqaga qaraymiz.
function coverageStart(today: string): string {
  const [y, m, d] = today.split('-');
  return `${Number(y) - 2}-${m}-${d}`;
}

function buildReport(rows: HisobotZayavka[], today: string): TurizmHisobot {
  const active = rows.filter((r) => !DEAD.has(r.statusId));

  // A) kelajakdagi xizmat sanasi — eng yaqin birinchi
  const kutilayotgan = active
    .filter((r) => r.dateBegin && r.dateBegin > today)
    .sort((a, b) => (a.dateBegin < b.dateBegin ? -1 : 1));

  // B) mijoz to'lagan (>TOL), partnyor tannarxi bor, partnyorga hali to'lanmagan
  const otkazilmagan = active
    .filter((r) => r.clientPaid > TOL && r.netto > TOL && r.partnerPaid <= TOL)
    .sort((a, b) => b.netto - a.netto);

  // C1) o'tgan/bugungi xizmat sanasi + mijoz qarzi bor
  const mijozQarz = active
    .filter((r) => r.dateBegin && r.dateBegin <= today && r.clientDebt > TOL)
    .sort((a, b) => b.clientDebt - a.clientDebt);

  // C2) biz partnyorga qarzmiz (sanadan qat'i nazar)
  const partnyorQarz = active
    .filter((r) => r.partnerDebt > TOL)
    .sort((a, b) => b.partnerDebt - a.partnerDebt);

  return {
    generatedAt: new Date().toISOString(),
    today,
    sinceDate: coverageStart(today),
    total: active.length,
    kutilayotgan,
    otkazilmagan,
    mijozQarz,
    partnyorQarz,
    kpi: {
      kutilayotganSoni: kutilayotgan.length,
      otkazilmaganSoni: otkazilmagan.length,
      mijozQarzSoni: mijozQarz.length,
      mijozQarzSumma: mijozQarz.reduce((s, r) => s + r.clientDebt, 0),
      partnyorQarzSoni: partnyorQarz.length,
      partnyorQarzSumma: partnyorQarz.reduce((s, r) => s + r.partnerDebt, 0),
    },
  };
}

// U-ON'ga har ochilishda urmaslik uchun 5 daqiqa kesh (sana kalitga kiradi).
async function fetchAndBuild(since: string, today: string): Promise<TurizmHisobot> {
  const rows = await listZayavki(since);
  return buildReport(rows, today);
}
const cachedReport = unstable_cache(fetchAndBuild, ['turizm-hisobot'], { revalidate: 300 });

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'sardor']);
  if (auth instanceof NextResponse) return auth;

  const today = todayStr();
  const since = coverageStart(today);
  const refresh = new URL(request.url).searchParams.get('refresh') === '1';

  try {
    const data = refresh ? await fetchAndBuild(since, today) : await cachedReport(since, today);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "U-ON bilan bog'lanib bo'lmadi" },
      { status: 502 },
    );
  }
}
