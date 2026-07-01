// Audit jurnali — kim / nima / qachon o'zgartirgani.
//
// Pul bilan ishlaydigan, ko'p foydalanuvchili tizim uchun o'zgarishlar tarixi
// zarur. Yozuvlar mavjud jsonb hujjat patternida ('audit' jadval) saqlanadi.
//
// Muhim: logAudit() HECH QACHON asosiy amalni bloklamaydi yoki sindirmaydi —
// xatolar yutiladi (appendToSheet(...).catch(()=>{}) uslubi). Jadval hali
// yaratilmagan bo'lsa ham sahifalar buzilmaydi (getObmenlar kabi try/catch).

import { getSupabase } from './supabase';
import type { AuditEntry, AuditAction, AuditEntity } from '@/types/avia';
import type { AuthUser } from './auth';

// Bitta audit yozuvini qo'shadi. Bloklamaydi — chaqiruvchi kutmasligi mumkin.
export async function logAudit(entry: Omit<AuditEntry, 'id' | 'ts'>): Promise<void> {
  try {
    const full: AuditEntry = {
      ...entry,
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: new Date().toISOString(),
    };
    const { error } = await getSupabase().from('audit').insert({ id: full.id, doc: full });
    if (error) throw error;
  } catch {
    // Audit yozilmasa ham asosiy amal buzilmasin
  }
}

// Aktor (foydalanuvchi) + amal ma'lumotlaridan qulay chaqiruv.
// Odatda: logChange(user, 'create', 'ticket', ticket.id, `Bilet ${ticket.biletRaqam}`, { after: ticket })
export function logChange(
  user: Pick<AuthUser, 'name' | 'role'> | null,
  action: AuditAction,
  entity: AuditEntity,
  entityId: string,
  summary: string,
  extra?: { before?: unknown; after?: unknown }
): Promise<void> {
  return logAudit({
    actorName: user?.name || 'nomaʼlum',
    actorRole: user?.role || 'admin',
    action,
    entity,
    entityId,
    summary,
    before: extra?.before,
    after: extra?.after,
  });
}

export interface AuditFilter {
  entity?: string;
  actor?: string;
  action?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  limit?: number;
}

// Audit yozuvlarini o'qish (eng yangi birinchi). Jadval yo'q bo'lsa [] qaytaradi.
export async function getAudit(filter: AuditFilter = {}): Promise<AuditEntry[]> {
  try {
    const { data, error } = await getSupabase().from('audit').select('doc');
    if (error) throw error;
    let rows = (data || []).map((r: { doc: AuditEntry }) => r.doc);

    if (filter.entity) rows = rows.filter((e) => e.entity === filter.entity);
    if (filter.action) rows = rows.filter((e) => e.action === filter.action);
    if (filter.actor) {
      const q = filter.actor.toLowerCase();
      rows = rows.filter((e) => e.actorName.toLowerCase().includes(q));
    }
    if (filter.from) rows = rows.filter((e) => e.ts.slice(0, 10) >= filter.from!);
    if (filter.to) rows = rows.filter((e) => e.ts.slice(0, 10) <= filter.to!);

    rows.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return typeof filter.limit === 'number' ? rows.slice(0, filter.limit) : rows;
  } catch {
    return [];
  }
}
