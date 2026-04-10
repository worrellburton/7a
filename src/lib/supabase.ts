import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client. All queries go through here and are
// constrained by RLS policies — no service-role key in browser code.
//
// Required environment variables (see .env.example):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//
// NEXT_PUBLIC_* values are inlined by Next.js at build time. If they're
// missing from the build environment we fall back to harmless placeholder
// values so the static-prerender phase of `next build` doesn't crash. A
// runtime warning is logged in the browser so a misconfigured deploy is
// obvious in devtools, and any actual query will fail at the network
// layer instead of silently succeeding.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (typeof window !== 'undefined' && (!url || !key)) {
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Set them in your Vercel project env (or .env.local for local dev) and redeploy.'
  );
}

export const supabase = createBrowserClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-anon-key'
);
