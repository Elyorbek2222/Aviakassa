import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getTurizmXodimlar, getTurizmKassa, getTurizmUlush } from '@/lib/avia-storage';
import { listPrixotTolovlar } from '@/lib/uon';
import { requireRole } from '@/lib/api-auth';
import { todayStr } from '@/lib/utils';
import { hisobValyuta } from '@/lib/turizm-kassa';

// oy'dan 24 oy oldingi sana (prixot to'lovlari shu oyda bo'lsa ham, zayavka
// xizmat sanasi kengroq bo'lishi mumkin — keng oyna olamiz).
function sinceFor(oy: string): string {
  const [y, m] = oy.split('-').map(Number);
  const idx = y * 12 + (m - 1) - 24;
  const sy = Math.floor(idx / 12), sm = (idx % 12) + 1;
  return `${sy}-${String(sm).padStart(2, '0')}-01`;
}

// GET ?oy=YYYY-MM — menejerlar kesimida oylik hisob-kitobi.
//   Oklad (roster) + KPI (tushgan pul × ulush 100% × KPI%) − to'langan = qoldiq.
//   KPI shu oyda pul TUSHGAN prixot to'lovlaridan (cio_id=1), so'mda.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;

    const oy = new URL(request.url).searchParams.get('oy') || todayStr().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(oy)) return NextResponse.json({ error: "Oy noto'g'ri" }, { status: 400 });
    const since = sinceFor(oy);

    const getTolovlar = unstable_cache(
      async () => listPrixotTolovlar(since),
      ['turizm-prixot-tolov', since],
      { revalidate: 300 },
    );

    const [{ xodimlar }, kassa, tolovlar, ulushMap] = await Promise.all([
      getTurizmXodimlar(), getTurizmKassa(), getTolovlar(), getTurizmUlush(),
    ]);

    const tolovOy = tolovlar.filter((t) => t.oy === oy);
    const oylikTks = kassa.filter((k) => k.tur === 'oylik' && k.sana.slice(0, 7) === oy && k.from);

    const rows = xodimlar.map((x) => {
      const mine = x.uonManagerId ? tolovOy.filter((t) => t.managerId === x.uonManagerId) : [];
      // Zayavka bo'yicha guruhlaymiz (bir zayavkada bir necha to'lov bo'lishi mumkin),
      // keyin har zayavkaga ulush % qo'llanadi. kpiBaza = Σ (tushgan × ulush%).
      const somByZ = new Map<number, number>();
      for (const t of mine) somByZ.set(t.rId, (somByZ.get(t.rId) || 0) + t.som);
      const detail = [...somByZ.entries()]
        .map(([zayavka, som]) => {
          const ulush = ulushMap[String(zayavka)] ?? 100;
          return { zayavka, som, ulush, hissa: Math.round((som * ulush) / 100) };
        })
        .sort((a, b) => b.som - a.som);
      const kpiBaza = detail.reduce((s, d) => s + d.hissa, 0);
      const kpiFoiz = x.kpiFoiz || 0;
      const kpi = Math.round((kpiBaza * kpiFoiz) / 100);
      const paid = oylikTks.filter((k) => (k.xodimId ? k.xodimId === x.id : k.xodim === x.ism));
      const tolanganSom = paid.filter((k) => hisobValyuta(k.from!) === 'uzs').reduce((s, k) => s + k.summa, 0);
      const tolanganUsd = paid.filter((k) => hisobValyuta(k.from!) === 'usd').reduce((s, k) => s + k.summa, 0);
      const okladSom = x.valyuta === 'uzs' ? x.oylik : 0;
      const okladUsd = x.valyuta === 'usd' ? x.oylik : 0;
      const jamiSom = okladSom + kpi;
      return {
        id: x.id, ism: x.ism, otdel: x.otdel, valyuta: x.valyuta, faol: x.faol,
        linked: !!x.uonManagerId, kpiFoiz,
        oklad: x.oylik, okladUsd,
        kpiBaza, kpi,
        jamiSom, tolanganSom, tolanganUsd, qoldiqSom: jamiSom - tolanganSom,
        detail,
      };
    });

    return NextResponse.json({ oy, xodimlar: rows });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
