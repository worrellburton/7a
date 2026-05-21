import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import { renderLogReportEmail, subjectFor } from '@/lib/log-report-email';
import { buildLogReportData } from '@/lib/log-report-data';

// POST /api/levers/log-report/test
//
// Sends the rendered weekly Log Report to ONE arbitrary email so
// a super admin can preview the actual inbox experience before
// firing the lever. Phase 5 wires the real Resend POST; if
// RESEND_API_KEY isn't configured the route falls back to a
// simulated success so the UI flow still works on a fresh env.

export const dynamic = 'force-dynamic';

const RESEND_URL = 'https://api.resend.com/emails';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface TestBody { to?: string }

function normalizeFrom(raw: string): string {
  // Match the email-campaign send route's behaviour — Vercel's
  // sensitive-env-var editor occasionally swaps spaces for
  // underscores in display names.
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

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = getAdminSupabase();
  const { data: meRow } = await admin
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (meRow?.is_super_admin !== true) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  let body: TestBody = {};
  try { body = (await req.json()) as TestBody; } catch { /* allow empty */ }
  const to = (body.to ?? '').trim();
  if (!to || !EMAIL_RE.test(to)) {
    return NextResponse.json({ error: 'Provide a valid email address.' }, { status: 400 });
  }

  const data = await buildLogReportData(admin);
  const html = renderLogReportEmail(data);
  const subject = subjectFor(data);
  const apiKey = process.env.RESEND_API_KEY;
  const from = normalizeFrom(process.env.RESEND_FROM || process.env.EMAIL_FROM || 'Seven Arrows Recovery <hello@sevenarrowsrecovery.com>');
  const replyTo = stripDisplayName(process.env.RESEND_REPLY_TO || process.env.EMAIL_REPLY_TO || from);

  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      simulated: true,
      sentTo: to,
      subject,
      from,
      replyTo,
      note: 'RESEND_API_KEY not configured — simulated success. Set the env var to send for real.',
    });
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, reply_to: replyTo }),
    });
    const txt = await res.text();
    if (!res.ok) {
      return NextResponse.json({
        error: `Resend rejected the send: HTTP ${res.status}`,
        detail: txt.slice(0, 2000),
      }, { status: 502 });
    }
    let providerId: string | null = null;
    try { providerId = (JSON.parse(txt) as { id?: string }).id ?? null; } catch { /* non-JSON */ }
    return NextResponse.json({
      ok: true,
      simulated: false,
      sentTo: to,
      subject,
      from,
      replyTo,
      providerId,
    });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Resend send failed',
    }, { status: 502 });
  }
}
