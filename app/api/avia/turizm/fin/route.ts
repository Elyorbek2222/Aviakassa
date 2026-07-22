import { NextRequest, NextResponse } from 'next/server';
import { getAllTurizmYozuvlar, getTurizmKassa, getTurizmXodimlar } from '@/lib/avia-storage';
import { requireRole } from '@/lib/api-auth';
import { todayStr } from '@/lib/utils';
import { turizmAccount, hisobValyuta } from '@/lib/turizm-kassa';
import { TURIZM_OTDELLAR } from '@/types/avia';

// Valyuta bo'yicha juftlik (aralashmasin uchun so'm/USD alohida)
type Val = { uzs: number; usd: number };
const zero = (): Val => ({ uzs: 0, usd: 0 });

// GET ?oy=YYYY-MM — oylik moliyaviy xisobot (fin otdel).
// Daromad/rasxod turizm prixot/rasxodidan, oyliklar TKS oylik yozuvlaridan;
// har biri o'z valyutasida (so'm/USD alohida). Sof = daromad − rasxod − oylik.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'sardor']);
    if (auth instanceof NextResponse) return auth;

    const oy = new URL(request.url).searchParams.get('oy') || todayStr().slice(0, 7);
    const inOy = (s: string) => s.slice(0, 7) === oy;

    const [yozuvlar, kassa, roster] = await Promise.all([
      getAllTurizmYozuvlar(), getTurizmKassa(), getTurizmXodimlar(),
    ]);

    // Daromad (prixot) / partnyor rasxod — o'z valyutasida
    const daromad = zero(), rasxod = zero(), oylik = zero();
    for (const y of yozuvlar) {
      if (!inOy(y.sana)) continue;
      const cur = hisobValyuta(turizmAccount(y));
      if (y.tur === 'prixot') daromad[cur] += y.summa; else rasxod[cur] += y.summa;
    }

    // To'langan oyliklar — bo'lim bo'yicha
    const byId = new Map(roster.xodimlar.map((x) => [x.id, x]));
    const byName = new Map(roster.xodimlar.map((x) => [x.ism, x]));
    const otdelKeys: string[] = [...TURIZM_OTDELLAR, 'boshqa'];
    const oylikByOtdel: Record<string, Val> = {};
    for (const k of otdelKeys) oylikByOtdel[k] = zero();

    for (const k of kassa) {
      if (k.tur !== 'oylik' || !inOy(k.sana) || !k.from) continue;
      const cur = hisobValyuta(k.from);
      oylik[cur] += k.summa;
      const od = k.otdel
        || (k.xodimId ? byId.get(k.xodimId)?.otdel : undefined)
        || (k.xodim ? byName.get(k.xodim)?.otdel : undefined)
        || 'boshqa';
      (oylikByOtdel[od] || oylikByOtdel.boshqa)[cur] += k.summa;
    }

    // Rejalashtirilgan oylik (faol xodimlar ro'yxatidan) — bo'lim bo'yicha
    const reja = zero();
    const rejaByOtdel: Record<string, Val> = {};
    for (const k of otdelKeys) rejaByOtdel[k] = zero();
    for (const x of roster.xodimlar) {
      if (!x.faol) continue;
      reja[x.valyuta] += x.oylik;
      rejaByOtdel[x.otdel][x.valyuta] += x.oylik;
    }

    const sof: Val = {
      uzs: daromad.uzs - rasxod.uzs - oylik.uzs,
      usd: daromad.usd - rasxod.usd - oylik.usd,
    };

    return NextResponse.json({ oy, daromad, rasxod, oylik, sof, oylikByOtdel, reja, rejaByOtdel });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
