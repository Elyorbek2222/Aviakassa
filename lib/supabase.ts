import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase klient (service_role kaliti bilan — to'liq ruxsat, RLS'ni chetlab o'tadi).
// Lazy: faqat birinchi ishlatilganda yaratiladi (build paytida env shart emas).
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    throw new Error('Supabase sozlanmagan: SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY kerak');
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
