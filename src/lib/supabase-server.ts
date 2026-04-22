import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

// ------------------------------------------------------------
// Server-side Supabase clients.
//
// Three flavors:
//   1. getServerSupabase()      — reads the user's session from cookies.
//                                 Use in Server Components / Route Handlers
//                                 that need to act *as* the user (RLS-safe).
//   2. getAdminSupabase()       — service-role client. Bypasses RLS.
//                                 Use ONLY for storage uploads or trusted
//                                 background operations. Never expose to the
//                                 browser.
//   3. getUserFromRequest(req)  — validate a Bearer token from an incoming
//                                 request and return the user. Legacy path
//                                 for route handlers that receive the token
//                                 explicitly.
// ------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in your Supabase project credentials.`
    );
  }
  return value;
}

export async function getServerSupabase() {
  const url = requireEnv(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv(supabaseAnonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // No-op: setAll can be called from a Server Component where
          // cookies are read-only. The browser middleware will refresh.
        }
      },
    },
  });
}

// Cookieless anon client — safe to use from statically-prerendered
// routes (generateStaticParams) and public pages that read data
// governed by an anon RLS policy. Unlike getServerSupabase(), this
// does not touch `cookies()` and therefore does not force the route
// to become dynamic at runtime.
let cachedPublic: SupabaseClient | null = null;
export function getPublicSupabase(): SupabaseClient {
  if (cachedPublic) return cachedPublic;
  const url = requireEnv(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv(supabaseAnonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  cachedPublic = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedPublic;
}

let cachedAdmin: SupabaseClient | null = null;
export function getAdminSupabase(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  const url = requireEnv(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv(supabaseServiceKey, 'SUPABASE_SERVICE_ROLE_KEY');
  cachedAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}

export async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  const url = requireEnv(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv(supabaseAnonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user } } = await client.auth.getUser(token);
  return user;
}
