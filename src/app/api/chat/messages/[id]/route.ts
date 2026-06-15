import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireChatAccess } from '@/lib/chat-server';

// PATCH  /api/chat/messages/[id]  — edit own message body
// DELETE /api/chat/messages/[id]  — soft-delete own message
//
// Chat is alumni-only (see lib/chat-server). Beyond that, only the
// author can edit/delete (super admins can hard-delete any message for
// moderation); we re-check here so the API returns a clean 403 instead
// of an opaque RLS error.

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireChatAccess(req);
  if (gate instanceof NextResponse) return gate;
  const user = gate.user;
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
  const gate = await requireChatAccess(req);
  if (gate instanceof NextResponse) return gate;
  const user = gate.user;
  const isSuperAdmin = gate.isSuperAdmin;
  const { id } = await ctx.params;

  const admin = getAdminSupabase();
  const { data: existing } = await admin
    .from('chat_messages')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
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
