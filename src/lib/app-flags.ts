import { getAdminSupabase } from '@/lib/supabase-server';

// Tiny server-side helper for reading runtime feature flags out
// of public.app_flags. Falls back to a `defaultValue` when the
// flag row is missing or the DB is unreachable so the rest of the
// app never hard-crashes on a transient outage.

export async function readFlag<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const admin = getAdminSupabase();
    const { data, error } = await admin
      .from('app_flags')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error || !data) return defaultValue;
    return (data.value as T) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}
