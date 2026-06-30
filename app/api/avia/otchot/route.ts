import { NextRequest, NextResponse } from 'next/server';
import { listOtchotlar, getOtchot } from '@/lib/avia-storage';

// ?id bo'lsa — o'sha oyning to'liq hujjati; aks holda barcha oylar ro'yxati.
export async function GET(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (id) {
      const doc = await getOtchot(id);
      return NextResponse.json(doc);
    }
    const items = await listOtchotlar();
    return NextResponse.json({ otchotlar: items });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
