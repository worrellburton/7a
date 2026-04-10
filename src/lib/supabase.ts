import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// Browser-side Supabase client. All queries go through here and are
// constrained by RLS policies — no service-role key in browser code.
//
// Required environment variables (see .env.example):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//
// The client is lazy-initialized. Next.js imports this module during the
// static-prerender phase of a build; if we threw at module load when env
// vars were missing, the whole build would fail even on pages that never
// actually touch Supabase at runtime. Deferring the env check to the first
// real property access keeps the build safe while still failing loudly at
// runtime if the project is misconfigured.

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env.local and fill in your Supabase project credentials.'
    );
  }
  _client = createBrowserClient(url, key);
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
