import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/seo/redirects/bulk
//   body: { text: string, status_code?: 301|302|307|308 }
//
// Parses a pasted blob of `old<separator>new` pairs (tab, comma, or
// whitespace) one per line. Blank lines and `#` comments are skipped.
// Existing rules on the same from_path are left alone (reports
// skipped). Admin-only.

export const dynamic = 'force-dynamic';

async function guardAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: me } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!me?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { ok: true as const };
}

function normalisePath(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith('/') ? s : `/${s}`;
}

function parseLine(raw: string): { from: string; to: string } | null {
  // Split on tab, comma, or 2+ spaces. `|` is also permitted to
  // accommodate admins dropping a quick markdown-ish list.
  const parts = raw.split(/[\t,|]|\s{2,}/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const from = normalisePath(parts[0]);
  const to = normalisePath(parts[1]);
  if (!from || !to) return null;
  return { from, to };
}

export async function POST(req: Request) {
  const guard = await guardAdmin();
  if ('error' in guard) return guard.error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }
  const text = typeof body.text === 'string' ? body.text : '';
  const status_code = Number(body.status_code ?? 301);
  if (![301, 302, 307, 308].includes(status_code)) {
    return NextResponse.json({ error: 'status_code must be 301/302/307/308' }, { status: 400 });
  }

  const parsed: Array<{ from_path: string; to_path: string; status_code: number; enabled: boolean; notes: string | null }> = [];
  const errors: string[] = [];
  let skipped = 0;

  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) return;
    const parsedLine = parseLine(line);
    if (!parsedLine) {
      errors.push(`Line ${i + 1}: could not parse "${rawLine.trim()}"`);
      return;
    }
    parsed.push({
      from_path: parsedLine.from,
      to_path: parsedLine.to,
      status_code,
      enabled: true,
      notes: 'Bulk imported',
    });
  });

  if (parsed.length === 0) {
    return NextResponse.json({ inserted: 0, skipped: 0, errors: errors.length > 0 ? errors : ['No parseable rows'] });
  }

  const admin = getAdminSupabase();
  // Fetch existing from_paths in one round-trip so we can report
  // skip-vs-insert counts without hammering the DB one row at a time.
  const fromPaths = parsed.map((p) => p.from_path);
  const { data: existing } = await admin.from('redirects').select('from_path').in('from_path', fromPaths);
  const existingSet = new Set((existing ?? []).map((r) => r.from_path as string));
  const toInsert = parsed.filter((p) => !existingSet.has(p.from_path));
  skipped += parsed.length - toInsert.length;

  let inserted = 0;
  if (toInsert.length > 0) {
    const { data, error } = await admin
      .from('redirects')
      .insert(toInsert)
      .select('id');
    if (error) {
      errors.push(`Insert failed: ${error.message}`);
    } else {
      inserted = data?.length ?? 0;
    }
  }

  revalidateTag('redirects', { expire: 0 });
  return NextResponse.json({ inserted, skipped, errors });
}
