import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client. All queries go through here and are
// constrained by RLS policies — no service-role key in browser code.
//
// Required environment variables (see .env.example):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//
// NEXT_PUBLIC_* values are inlined by Next.js at build time. We defer the
// missing-env check until actual browser runtime: during `next build`'s
// static-prerender phase, `window` is undefined, so a misconfigured build
// environment won't crash prerender on pages that import this module. In
// the real browser, a missing env var throws loudly on module load and
// makes the problem immediately visible in devtools.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (typeof window !== 'undefined' && (!url || !key)) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Set them in your Vercel project env (or .env.local for local dev) and redeploy.'
  );
}

export const supabase = createBrowserClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-anon-key'
);
