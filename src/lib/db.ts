import { supabase } from './supabase';

interface DbOptions {
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  table: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  match?: Record<string, unknown>;
  select?: string;
  order?: { column: string; ascending: boolean };
  onConflict?: string;
}

export async function db(options: DbOptions, token?: string) {
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || '';
  }

  const res = await fetch('/api/db', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  return res.json();
}
