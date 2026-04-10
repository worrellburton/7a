import { supabase } from './supabase';

// ------------------------------------------------------------
// Thin typed wrapper around the Supabase browser client.
//
// Historically this file proxied requests to /api/db, which used the
// SERVICE_ROLE key to bypass RLS. That endpoint has been removed — all
// queries now go straight to PostgREST from the browser and are
// constrained by the project's RLS policies.
//
// The function signature is unchanged so existing pages compile without
// modification. New code should prefer `supabase.from(...)` directly.
// ------------------------------------------------------------

interface DbOptions {
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  table: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  match?: Record<string, unknown>;
  select?: string;
  order?: { column: string; ascending: boolean };
  onConflict?: string;
}

export async function db(options: DbOptions) {
  const { action, table, data, match, select, order, onConflict } = options;

  try {
    if (action === 'select') {
      let query = supabase.from(table).select(select || '*');
      if (match) {
        for (const [key, value] of Object.entries(match)) {
          query = query.eq(key, value);
        }
      }
      if (order) {
        query = query.order(order.column, { ascending: order.ascending ?? true });
      }
      const { data: rows, error } = await query;
      if (error) return { error: error.message };
      return rows;
    }

    if (action === 'insert') {
      const { data: row, error } = await supabase
        .from(table)
        .insert(data as Record<string, unknown>)
        .select()
        .single();
      if (error) return { error: error.message };
      return row;
    }

    if (action === 'update') {
      let query = supabase.from(table).update(data as Record<string, unknown>);
      if (match) {
        for (const [key, value] of Object.entries(match)) {
          query = query.eq(key, value);
        }
      }
      const { error } = await query;
      if (error) return { error: error.message };
      return { ok: true };
    }

    if (action === 'upsert') {
      const { error } = await supabase
        .from(table)
        .upsert(data as Record<string, unknown>, { onConflict: onConflict || 'id' });
      if (error) return { error: error.message };
      return { ok: true };
    }

    if (action === 'delete') {
      let query = supabase.from(table).delete();
      if (match) {
        for (const [key, value] of Object.entries(match)) {
          query = query.eq(key, value);
        }
      }
      const { error } = await query;
      if (error) return { error: error.message };
      return { ok: true };
    }

    return { error: 'Invalid action' };
  } catch (err) {
    return { error: String(err) };
  }
}

// ------------------------------------------------------------
// Access token shim for the legacy REST proxies (/api/ctm, /api/upload).
// AuthProvider calls setAuthToken() whenever the session changes so these
// helpers stay in sync without awaiting.
// ------------------------------------------------------------

let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

export function getAuthToken(): string {
  return _authToken || '';
}
