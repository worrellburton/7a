import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { renderLogReportEmail, subjectFor } from '@/lib/log-report-email';
import { buildLogReportData } from '@/lib/log-report-data';
import { withCronLogging } from '@/lib/cron-observability';

// GET /api/cron/levers/log-report
//
// Auto-fires the 🪵 Log Report every week. Vercel's cron service
// hits this URL on a schedule (configured in vercel.json) — we
// gate it on CRON_SECRET so only Vercel can pull the lever
// without a human in the loop.
//
// Recipient set = every super admin with an email (same default
// the manual pull uses). Writes the same lever_pulls audit rows
// the manual flow does, with status='auto' instead of 'sent' so
// the history disclosure can distinguish them at a glance.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RESEND_URL = 'https://api.resend.com/emails';
const MAX_PARALLEL = 6;

function normalizeFrom(raw: string): string {
  const trimmed = raw.trim();
  const angle = trimmed.indexOf('<');
  if (angle === -1) return trimmed;
  const namePart = trimmed.slice(0, angle).replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  const addrPart = trimmed.slice(angle);
  return namePart ? `${namePart} ${addrPart}` : addrPart;
}

function stripDisplayName(raw: string): string {
  const trimmed = raw.trim();
  const open = trimmed.indexOf('<');
  const close = trimmed.lastIndexOf('>');
  if (open !== -1 && close > open) return trimmed.slice(open + 1, close).trim();
  return trimmed;
}

// The most recent UTC datetime at (weekday === dayOfWeek, hour ===
// hourUtc, minute 0) that is at or before `now`. Walks back at most a
// week from today's candidate until the weekday lines up. Used so the
// cron can catch up a missed top-of-hour tick instead of requiring an
// exact-hour match.
function mostRecentOccurrence(now: Date, dayOfWeek: number, hourUtc: number): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc, 0, 0, 0));
  for (let i = 0; i < 8; i += 1) {
    if (d.getUTCDay() === dayOfWeek && d.getTime() <= now.getTime()) return d;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d;
}

export async function GET(req: NextRequest) {
  return withCronLogging('/api/cron/levers/log-report', async () => {
  // Vercel passes the cron secret as `Authorization: Bearer <secret>`.
  // Bail with 401 on anything else so a random bot scraping
  // /api/cron/* can't trigger the broadcast.
  const auth = req.headers.get('authorization') ?? '';
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminSupabase();

  // Read the persisted schedule. vercel.json fires this cron every
  // hour at minute 0; the endpoint decides whether the most recent
  // scheduled occurrence still needs sending. Skip silently when the
  // schedule is disabled or missing — keeps the cron polite + cheap.
  const { data: schedule } = await admin
    .from('lever_schedules')
    .select('enabled, day_of_week, hour_utc, recipient_user_ids, last_fired_at')
    .eq('lever_type', 'log-report')
    .maybeSingle();
  if (!schedule || schedule.enabled !== true) {
    return NextResponse.json({ ok: true, skipped: 'schedule disabled or missing' });
  }

  // Catch-up scheduling. Rather than demanding the cron tick land on
  // the EXACT scheduled hour (a single missed/drifted Vercel run
  // would skip the whole week), compute the most recent occurrence
  // of (day_of_week @ hour_utc) at or before now, then fire if we're
  // within a 24h catch-up window and haven't already fired for it.
  const now = new Date();
  const occurrence = mostRecentOccurrence(now, schedule.day_of_week, schedule.hour_utc);
  const CATCH_UP_MS = 24 * 60 * 60 * 1000;
  const sinceOccurrence = now.getTime() - occurrence.getTime();
  if (sinceOccurrence < 0 || sinceOccurrence > CATCH_UP_MS) {
    return NextResponse.json({
      ok: true,
      skipped: 'outside catch-up window',
      now: now.toISOString(),
      occurrence: occurrence.toISOString(),
    });
  }
  const lastFired = schedule.last_fired_at ? new Date(schedule.last_fired_at as string) : null;
  if (lastFired && lastFired.getTime() >= occurrence.getTime()) {
    return NextResponse.json({ ok: true, skipped: 'already fired this occurrence', occurrence: occurrence.toISOString() });
  }

  // Atomically claim this occurrence so two overlapping cron
  // invocations can't both send. Optimistic concurrency: only the
  // update whose pre-image still matches the last_fired_at we just
  // read wins; a concurrent invocation that already advanced it sees
  // zero rows updated and bails.
  const claimBase = admin
    .from('lever_schedules')
    .update({ last_fired_at: now.toISOString() })
    .eq('lever_type', 'log-report');
  const claimQuery = lastFired
    ? claimBase.eq('last_fired_at', schedule.last_fired_at as string)
    : claimBase.is('last_fired_at', null);
  const { data: claimed } = await claimQuery.select('lever_type');
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'occurrence claimed by a concurrent run', occurrence: occurrence.toISOString() });
  }
  // Saved recipient set wins; falls back to every super admin
  // when the list is empty so a freshly-seeded org still gets the
  // weekly email.
  const savedIds = Array.isArray(schedule.recipient_user_ids)
    ? (schedule.recipient_user_ids as string[]).filter((v) => typeof v === 'string' && v.length > 0)
    : [];
  let recipientQuery = admin.from('users').select('id, full_name, email');
  if (savedIds.length > 0) {
    recipientQuery = recipientQuery.in('id', savedIds);
  } else {
    recipientQuery = recipientQuery.eq('is_super_admin', true);
  }
  const { data: recipientRows } = await recipientQuery.not('email', 'is', null);
  const recipients = ((recipientRows ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>)
    .filter((u) => !!u.email)
    .map((u) => ({ id: u.id, name: u.full_name, email: u.email as string }));

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: 'No super admins with email.' });
  }

  const data = await buildLogReportData(admin);
  const html = renderLogReportEmail(data);
  const subject = subjectFor(data);
  const apiKey = process.env.RESEND_API_KEY;
  const from = normalizeFrom(process.env.RESEND_FROM || process.env.EMAIL_FROM || 'Seven Arrows Recovery <hello@sevenarrowsrecovery.com>');
  const replyTo = stripDisplayName(process.env.RESEND_REPLY_TO || process.env.EMAIL_REPLY_TO || from);
  const simulated = !apiKey;

  const metadata = {
    window: data.window,
    total: data.counts.total,
    uniqueContacts: data.counts.uniqueContacts,
    uniqueReps: data.counts.uniqueReps,
    totalDurationSec: data.counts.totalDurationSec,
    topRep: data.leaderboard[0] ? { name: data.leaderboard[0].name, logs: data.leaderboard[0].logs } : null,
    subject,
    trigger: 'cron',
  };

  let sent = 0;
  let failed = 0;
  let cursor = 0;
  const handleOne = async (r: typeof recipients[number]) => {
    let ok = false;
    let errText: string | null = null;
    let providerMessageId: string | null = null;
    if (simulated) {
      ok = true;
    } else {
      try {
        const res = await fetch(RESEND_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: [r.email], subject, html, reply_to: replyTo }),
        });
        const txt = await res.text();
        if (res.ok) {
          ok = true;
          try { providerMessageId = (JSON.parse(txt) as { id?: string }).id ?? null; } catch { /* */ }
        } else {
          errText = `HTTP ${res.status}: ${txt.slice(0, 1000)}`;
        }
      } catch (e) {
        errText = e instanceof Error ? e.message : String(e);
      }
    }
    if (ok) sent += 1; else failed += 1;
    await admin.from('lever_pulls').insert({
      lever_type: 'log-report',
      target_user_id: r.id,
      pulled_by: null,
      pulled_by_name: 'Sunday cron',
      status: ok ? (simulated ? 'simulated' : 'sent') : 'failed',
      metadata: { ...metadata, recipient: { name: r.name, email: r.email }, providerMessageId, error: errText },
    });
  };
  const worker = async () => {
    while (cursor < recipients.length) {
      const idx = cursor;
      cursor += 1;
      const r = recipients[idx];
      if (!r) continue;
      await handleOne(r);
    }
  };
  const workers: Array<Promise<void>> = [];
  for (let i = 0; i < Math.min(MAX_PARALLEL, recipients.length); i += 1) workers.push(worker());
  await Promise.all(workers);

  return NextResponse.json({ ok: true, sent, failed, simulated, recipients: recipients.length });
  });
}
