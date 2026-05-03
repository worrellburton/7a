import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// PATCH  /api/chat/messages/[id]  — edit own message body
// DELETE /api/chat/messages/[id]  — soft-delete own message
//
// Only the author can edit/delete; RLS already enforces this for the
// `users-table` Supabase JS path, but we re-check here so the API
// returns a clean 403 instead of an opaque RLS error.

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  let body: { body?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) return NextResponse.json({ error: 'body is empty' }, { status: 400 });

  const admin = getAdminSupabase();
  const { data: existing } = await admin
    .from('chat_messages')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if ((existing as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await admin
    .from('chat_messages')
    .update({ body: text, edited_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const [{ data: existing }, { data: meRow }] = await Promise.all([
    admin.from('chat_messages').select('user_id').eq('id', id).maybeSingle(),
    admin.from('users').select('is_super_admin').eq('id', user.id).maybeSingle(),
  ]);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const isSuperAdmin = (meRow as { is_super_admin?: boolean } | null)?.is_super_admin === true;
  const isAuthor = (existing as { user_id: string }).user_id === user.id;
  if (!isSuperAdmin && !isAuthor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Super admins HARD-delete (row removed, gone from history); the
  // message author SOFT-deletes (row stays so the timeline doesn't
  // gap; body blanked + deleted_at set so the UI renders an
  // anonymous "(message deleted)" placeholder).
  if (isSuperAdmin) {
    const { error } = await admin.from('chat_messages').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, mode: 'hard' });
  }
  const { error } = await admin
    .from('chat_messages')
    .update({ body: '', deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, mode: 'soft' });
}
