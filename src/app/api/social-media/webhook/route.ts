import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// POST /api/social-media/webhook?secret=<AYRSHARE_WEBHOOK_SECRET>
//
// Receiver for Ayrshare post-status webhooks. Register this URL in the
// Ayrshare dashboard (Webhooks → "action" / "social") so post sent /
// errored events are pushed to us instead of us polling /history (which
// doesn't reliably surface future-scheduled posts). Each event is recorded
// to activity_log so the Scheduled / History views can reflect real status.
//
// Auth: a shared secret in the query string (Ayrshare can't send custom
// auth headers). Set AYRSHARE_WEBHOOK_SECRET and append ?secret=… to the
// registered URL. If the env var is unset we reject (fail closed).

export const dynamic = 'force-dynamic';

function pickString(o: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) { const v = o[k]; if (typeof v === 'string' && v) return v; }
  return null;
}

export async function POST(req: Request) {
  const secret = process.env.AYRSHARE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  const url = new URL(req.url);
  if (url.searchParams.get('secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try { payload = (await req.json()) as Record<string, unknown>; } catch { /* empty */ }

  const ayrshareId = pickString(payload, 'id', 'refId', 'postId');
  const action = pickString(payload, 'action', 'type') ?? 'event';
  const rawStatus = (pickString(payload, 'status', 'state') ?? '').toLowerCase();
  const platforms = Array.isArray(payload.platforms)
    ? (payload.platforms as unknown[]).filter((p): p is string => typeof p === 'string')
    : [];

  // Map Ayrshare's status into our activity_log event types.
  const type = rawStatus.includes('error') || rawStatus.includes('fail')
    ? 'social.failed'
    : rawStatus.includes('success') || rawStatus.includes('post') || rawStatus.includes('sent')
      ? 'social.posted'
      : 'social.webhook';

  try {
    const admin = getAdminSupabase();
    await admin.from('activity_log').insert({
      user_id: null,
      type,
      target_kind: 'social_post',
      target_id: null,
      target_label: pickString(payload, 'post', 'title')?.slice(0, 80) ?? null,
      target_path: '/feather/social-media',
      metadata: { source: 'ayrshare_webhook', action, status: rawStatus, ayrshareId, platforms, raw: payload },
    });
  } catch {
    // Never make Ayrshare retry on our logging failure — ack regardless.
  }
  // Always 200 so Ayrshare marks the delivery successful.
  return NextResponse.json({ ok: true });
}
