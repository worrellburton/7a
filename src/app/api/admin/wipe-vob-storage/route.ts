import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/content-server';

// POST /api/admin/wipe-vob-storage
// One-shot admin tool that empties the legacy `vob-cards` Supabase
// Storage bucket. The form no longer uploads card photos to storage
// (HIPAA: photos now ride along as email attachments only); this
// route lets a super admin clear out the historical files in one
// click rather than walking the dashboard.
//
// Super-admin only. Reads the storage list, removes everything in
// batches of 100, returns the total count removed.
//
// Safe to call repeatedly — once the bucket is empty subsequent calls
// return zero.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'vob-cards';
const PAGE_SIZE = 100;

async function listAll(): Promise<string[]> {
  const admin = getAdminSupabase();
  const collected: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage
      .from(BUCKET)
      .list('', { limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`list failed: ${error.message}`);
    if (!data || data.length === 0) break;
    // The default list call returns only top-level entries. Each
    // entry in `vob-cards` is a folder named after the token the
    // form generated, holding front.<ext> / back.<ext>. We recurse
    // one level deep — the bucket never went deeper than that.
    for (const item of data) {
      const isFolder = item.id === null;
      if (isFolder) {
        const { data: inner, error: innerErr } = await admin.storage
          .from(BUCKET)
          .list(item.name, { limit: PAGE_SIZE });
        if (innerErr) throw new Error(`inner list ${item.name}: ${innerErr.message}`);
        for (const f of inner ?? []) collected.push(`${item.name}/${f.name}`);
      } else {
        collected.push(item.name);
      }
    }
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return collected;
}

export async function POST(req: NextRequest) {
  const gate = await requireSuperAdmin(req);
  if (gate.error) return gate.error;

  const admin = getAdminSupabase();
  let paths: string[];
  try {
    paths = await listAll();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
  if (paths.length === 0) return NextResponse.json({ ok: true, removed: 0 });

  let removed = 0;
  for (let i = 0; i < paths.length; i += PAGE_SIZE) {
    const chunk = paths.slice(i, i + PAGE_SIZE);
    const { error } = await admin.storage.from(BUCKET).remove(chunk);
    if (error) {
      return NextResponse.json({ error: `remove failed at offset ${i}: ${error.message}`, removed }, { status: 500 });
    }
    removed += chunk.length;
  }
  return NextResponse.json({ ok: true, removed });
}
