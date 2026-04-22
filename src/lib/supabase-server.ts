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

// Turn a Supabase Storage public URL into a signed URL that external
// downloaders (fal.ai, for example) can always pull — regardless of
// whether the bucket is actually flagged public or whether the object
// ACL has drifted. Non-Supabase URLs (or malformed input) are returned
// unchanged so callers can pipe any input through safely.
//
// Pattern we need to rewrite:
//   https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<path>
//     → signed URL valid for `expiresInSeconds`.
// Already-signed URLs (/sign/ path with ?token=...) are passed through
// as-is since they're already long-lived enough for a single job.
export async function signedUrlForSupabaseAsset(
  url: string | null | undefined,
  expiresInSeconds = 60 * 60 * 24, // 24h — safely outlives any fal.ai queue
): Promise<string | null> {
  if (!url) return null;
  const projectUrl = supabaseUrl;
  if (!projectUrl) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  // Only rewrite URLs that point at our Supabase project's storage API.
  const projectHost = new URL(projectUrl).host;
  if (parsed.host !== projectHost) return url;

  // Expected path: /storage/v1/object/public/<bucket>/<rest...>
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts.length < 6) return url;
  if (parts[0] !== 'storage' || parts[1] !== 'v1' || parts[2] !== 'object') return url;

  // Already signed? Pass through; re-signing a signed URL just adds latency.
  if (parts[3] === 'sign') return url;
  if (parts[3] !== 'public') return url;

  const bucket = parts[4];
  const objectPath = parts.slice(5).map(decodeURIComponent).join('/');

  const admin = getAdminSupabase();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    // eslint-disable-next-line no-console
    console.warn('[signedUrlForSupabaseAsset] sign failed, falling back to public URL', {
      bucket,
      objectPath,
      error: error?.message,
    });
    return url;
  }
  return data.signedUrl;
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
