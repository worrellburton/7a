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

// Module-level token synced by AuthProvider — always fresh
let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

export async function db(options: DbOptions) {
  let token = _authToken;

  // Fallback: try getSession if AuthProvider hasn't set the token yet
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
