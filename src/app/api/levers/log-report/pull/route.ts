import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import { renderLogReportEmail, subjectFor, type LogReportData } from '@/lib/log-report-email';
import { buildLogReportData } from '@/lib/log-report-data';

// POST /api/levers/log-report/pull
//
// Fires the weekly Log Report to a chosen cohort of teammates.
// Phase 7 ships the real Resend send, the activity-feed row in
// public.lever_pulls (one row per recipient with the recap totals
// stashed in metadata jsonb), and a small concurrent worker pool
// (matches the email-campaign send route) so a 10-recipient pull
// doesn't block the page on serial Resend latency.
//
// Body: { recipientIds?: string[] }
//   When omitted, defaults to every super admin with a non-null
//   email — same set the lever's preview surfaces under
//   defaultRecipients.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RESEND_URL = 'https://api.resend.com/emails';
const MAX_PARALLEL = 6;

interface PullBody {
  recipientIds?: string[];
}

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

function recapMetadata(data: LogReportData): Record<string, unknown> {
  return {
    window: data.window,
    total: data.counts.total,
    uniqueContacts: data.counts.uniqueContacts,
    uniqueReps: data.counts.uniqueReps,
    totalDurationSec: data.counts.totalDurationSec,
    topRep: data.leaderboard[0] ? { name: data.leaderboard[0].name, logs: data.leaderboard[0].logs } : null,
  };
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = getAdminSupabase();
  const { data: meRow } = await admin
    .from('users')
    .select('id, full_name, is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (meRow?.is_super_admin !== true) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  let body: PullBody = {};
  try { body = (await req.json()) as PullBody; } catch { /* allow empty */ }

  // Resolve recipient set. Explicit override wins; default = every
  // super admin with a real email.
  const explicitIds = Array.isArray(body.recipientIds)
    ? body.recipientIds.filter((id) => typeof id === 'string' && id.length > 0)
    : null;

  let recipientQuery = admin.from('users').select('id, full_name, email');
  if (explicitIds && explicitIds.length > 0) {
    recipientQuery = recipientQuery.in('id', explicitIds);
  } else {
    recipientQuery = recipientQuery.eq('is_super_admin', true);
  }
  const { data: recipientRows, error: recErr } = await recipientQuery.not('email', 'is', null);
  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });
  const recipients = ((recipientRows ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>)
    .filter((u) => !!u.email)
    .map((u) => ({ id: u.id, name: u.full_name, email: u.email as string }));

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, simulated: false, recipients: [], note: 'No eligible recipients.' });
  }

  const data = await buildLogReportData(admin);
  const html = renderLogReportEmail(data);
  const subject = subjectFor(data);
  const apiKey = process.env.RESEND_API_KEY;
  const from = normalizeFrom(process.env.RESEND_FROM || process.env.EMAIL_FROM || 'Seven Arrows Recovery <hello@sevenarrowsrecovery.com>');
  const replyTo = stripDisplayName(process.env.RESEND_REPLY_TO || process.env.EMAIL_REPLY_TO || from);
  const simulated = !apiKey;
  const metadata = recapMetadata(data);

  let sent = 0;
  let failed = 0;
  const sentRows: Array<{ id: string; name: string | null; email: string; ok: boolean; error?: string }> = [];

  // Concurrent send pool — matches the email-campaign send route's
  // pattern. 6 in-flight keeps wall time low without tripping
  // Resend's rate limit.
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
    sentRows.push({ id: r.id, name: r.name, email: r.email, ok, error: errText ?? undefined });

    // Write to the activity feed — one lever_pulls row per
    // recipient with the recap totals attached. Failures still
    // get a row stamped status=failed so the audit trail is
    // complete.
    await admin.from('lever_pulls').insert({
      lever_type: 'log-report',
      target_user_id: r.id,
      pulled_by: user.id,
      pulled_by_name: meRow?.full_name ?? null,
      status: ok ? (simulated ? 'simulated' : 'sent') : 'failed',
      metadata: {
        ...metadata,
        recipient: { name: r.name, email: r.email },
        subject,
        providerMessageId,
        error: errText,
      },
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

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    simulated,
    subject,
    recipients: sentRows,
  });
}
