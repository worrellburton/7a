import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client. All queries go through here and are
// constrained by RLS policies — no service-role key in browser code.
//
// Required environment variables (see .env.example):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env.local and fill in your Supabase project credentials.'
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
