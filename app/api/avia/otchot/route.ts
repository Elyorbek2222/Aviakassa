import { NextRequest, NextResponse } from 'next/server';
import { listOtchotlar, getOtchot, listOylikXisobot } from '@/lib/avia-storage';
import { requireAuth, requireRole } from '@/lib/api-auth';

// ?xisobot=1 — oylik xisobot (biletlar ↔ kirgan pul); ?id — o'sha oyning to'liq
// hujjati; aks holda barcha oylar ro'yxati.
export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;

    if (sp.get('xisobot')) {
      // Kirgan pul (prixot) — moliyaviy ma'lumot; aviakassir (begzod) ko'rmaydi.
      const auth = await requireRole(['admin', 'kassir', 'buxgalter']);
      if (auth instanceof NextResponse) return auth;
      return NextResponse.json({ xisobot: await listOylikXisobot() });
    }

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const id = sp.get('id');
    if (id) {
      // prixot-* / turizm-* moliyaviy hujjatlar shu jadvalda yashaydi, lekin bu
      // umumiy (har rol kiradigan) endpoint ORQALI o'qilmasin — ular o'zining
      // rolga bog'langan route'i bor (/api/avia/prixot, /api/avia/turizm) va
      // listOtchotlar() ham ularni yashiradi. Aks holda begzod/sardor to'g'ridan
      // -to'g'ri ?id=prixot-YYYY-MM bilan kirgan pul ma'lumotini ko'rar edi.
      if (id.startsWith('prixot-') || id.startsWith('turizm-') || id.startsWith('TKS-') || id.startsWith('oylik-')) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
      }
      const doc = await getOtchot(id);
      return NextResponse.json(doc);
    }
    const items = await listOtchotlar();
    return NextResponse.json({ otchotlar: items });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
