import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-gates';

// POST /api/hardware/flag
//
// Files a "This isn't right" flag from the home hardware check-in.
// Server-side (not a direct client insert) because filing the flag
// also notifies the hardware owners by email — Rosa, Pamela, and
// Bobby — which needs the Resend key. The flag row itself still
// drives the red alert + realtime banner on the Hardware page; the
// email failing never blocks the flag.

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const RESEND_URL = 'https://api.resend.com/emails';
// Matched against users.full_name at send time so address changes in
// the users table flow through without a code change.
const NOTIFY_NAME_PREFIXES = ['rosa%', 'pamela%', 'bobby%'];

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(req: NextRequest) {
  const gate = await requireUser(req);
  if (gate instanceof NextResponse) return gate;
  const { admin, userId } = gate;

  let body: { item_id?: unknown; message?: unknown } = {};
  try { body = await req.json(); } catch { /* fallthrough */ }
  const itemId = typeof body.item_id === 'string' ? body.item_id : null;
  const message = typeof body.message === 'string' && body.message.trim() ? body.message.trim().slice(0, 2000) : null;
  if (!itemId) return NextResponse.json({ error: 'item_id is required' }, { status: 400 });

  const { data: item, error: itemErr } = await admin
    .from('hardware_items')
    .select('id, type, model, location, assigned_to')
    .eq('id', itemId)
    .maybeSingle();
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 });
  if (!item) return NextResponse.json({ error: 'Hardware item not found' }, { status: 404 });

  const { error: flagErr } = await admin.from('hardware_flags').insert({
    item_id: item.id,
    flagged_by: userId,
    message,
    reported_assigned_to: item.assigned_to,
  });
  if (flagErr) return NextResponse.json({ error: flagErr.message }, { status: 500 });

  // Who flagged it — for the email body.
  const { data: flagger } = await admin
    .from('users')
    .select('full_name, email')
    .eq('id', userId)
    .maybeSingle();
  const flaggerName = (flagger as { full_name?: string | null } | null)?.full_name || 'A team member';

  // Notify Rosa, Pamela, and Bobby. Best-effort: a missing key or a
  // bounced address must not fail the flag the user just filed.
  let emailed = 0;
  try {
    const orFilter = NOTIFY_NAME_PREFIXES.map((p) => `full_name.ilike.${p}`).join(',');
    const { data: recipients } = await admin
      .from('users')
      .select('full_name, email')
      .or(orFilter)
      .not('email', 'is', null);
    const toList = ((recipients ?? []) as Array<{ full_name: string | null; email: string | null }>)
      .map((r) => r.email)
      .filter((e): e is string => !!e);

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && toList.length > 0) {
      const label = [item.type, item.model].filter(Boolean).join(' — ') || 'Hardware item';
      const subject = `⚑ Hardware flagged: ${label}`;
      const html = `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#2b2320;">
          <p style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8a7f78;margin:0 0 8px;">Hardware check-in</p>
          <h1 style="font-size:20px;margin:0 0 16px;">Someone said this hardware isn&rsquo;t right</h1>
          <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
            <strong>${esc(flaggerName)}</strong> tapped <em>&ldquo;This isn&rsquo;t right&rdquo;</em> on a hardware
            assignment during their home-screen check-in.
          </p>
          <table style="font-size:14px;line-height:1.7;border-collapse:collapse;">
            <tr><td style="padding-right:16px;color:#8a7f78;">Item</td><td><strong>${esc(item.model || '(no model)')}</strong></td></tr>
            <tr><td style="padding-right:16px;color:#8a7f78;">Type</td><td>${esc(item.type || '—')}</td></tr>
            <tr><td style="padding-right:16px;color:#8a7f78;">Assigned to</td><td>${esc(item.assigned_to || '—')}</td></tr>
            <tr><td style="padding-right:16px;color:#8a7f78;">Location</td><td>${esc(item.location || '—')}</td></tr>
            ${message ? `<tr><td style="padding-right:16px;color:#8a7f78;">Note</td><td>${esc(message)}</td></tr>` : ''}
          </table>
          <p style="font-size:13px;line-height:1.6;margin:20px 0 0;color:#5d534d;">
            It&rsquo;s showing as a red alert on the Hardware page — open Feather &rarr; Hardware to reassign or resolve it.
          </p>
        </div>`;
      const from = (process.env.RESEND_FROM || process.env.EMAIL_FROM || 'Seven Arrows Recovery <hello@sevenarrowsrecovery.com>').trim();
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: toList, subject, html }),
      });
      if (res.ok) emailed = toList.length;
      else console.error('[hardware/flag] email send failed:', res.status, (await res.text()).slice(0, 500));
    }
  } catch (e) {
    console.error('[hardware/flag] email send threw:', e);
  }

  return NextResponse.json({ ok: true, emailed });
}
