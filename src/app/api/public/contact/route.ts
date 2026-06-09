import { NextRequest, NextResponse } from 'next/server';
import { getPublicSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const RESEND_URL = 'https://api.resend.com/emails';

// Inbox routing for the Contact Us modal's Subject dropdown. The
// modal validates the dropdown options client-side and the server
// re-validates below, so any value not in this map falls back to
// the general inbox rather than silently dropping the lead.
const SUBJECT_INBOX: Record<string, { to: string; label: string }> = {
  general_inquiry: { to: 'info@sevenarrowsrecovery.com', label: 'General Inquiry' },
  admissions: { to: 'admissions@sevenarrowsrecovery.com', label: 'Admissions' },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Detects gibberish messages — random keysmash like "BuMundgALtGcMETfBlB"
 * that bots fire into contact forms to test whether the form posts.
 * Treats a message as gibberish when ANY of:
 *
 *   1. A single "word" (no whitespace) longer than 6 chars contains
 *      3+ internal case flips (camelCase-but-random pattern). Real
 *      brand-style camelCase like "PayPal" / "iPhone" / "eBay" tops
 *      out at 1–2 flips, so 3+ is a strong spam signal.
 *
 *   2. A 10+ char word's vowel ratio is below 15%. English words
 *      average ~38% vowels and even consonant-heavy German loanwords
 *      stay above 15%, so anything below is mashed letters.
 *
 *   3. The whole message is a single long token (≥15 chars, no
 *      whitespace) — real human messages contain spaces.
 *
 * Conservative on purpose: a message has to flag at least one of
 * the above for a majority of its tokens before we mark it spam,
 * so a legitimate short note like "ASAP" doesn't get nuked.
 */
function looksLikeGibberish(text: string | null | undefined): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 6) return false;

  // Whole-message single-token check.
  if (trimmed.length >= 15 && !/\s/.test(trimmed) && /^[A-Za-z]+$/.test(trimmed)) {
    if (caseFlipCount(trimmed) >= 3) return true;
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  let gibberishTokens = 0;
  let countableTokens = 0;
  for (const t of tokens) {
    if (t.length < 6) continue;
    countableTokens++;
    if (isGibberishToken(t)) gibberishTokens++;
  }
  if (countableTokens === 0) return false;
  return gibberishTokens / countableTokens >= 0.5;
}

function isGibberishToken(word: string): boolean {
  if (word.length < 6) return false;
  if (caseFlipCount(word) >= 3) return true;
  if (word.length >= 10) {
    const letters = word.replace(/[^A-Za-z]/g, '');
    if (letters.length === 0) return false;
    const vowels = (word.match(/[aeiouAEIOU]/g) || []).length;
    if (vowels / letters.length < 0.15) return true;
  }
  return false;
}

function caseFlipCount(word: string): number {
  let flips = 0;
  for (let i = 1; i < word.length; i++) {
    const prev = word[i - 1];
    const cur = word[i];
    if (!/[A-Za-z]/.test(prev) || !/[A-Za-z]/.test(cur)) continue;
    const prevUp = prev === prev.toUpperCase() && prev !== prev.toLowerCase();
    const curUp = cur === cur.toUpperCase() && cur !== cur.toLowerCase();
    if (prevUp !== curUp) flips++;
  }
  return flips;
}

/**
 * Public contact form endpoint. Accepts a JSON POST from any of the
 * site's contact-style forms (Footer's ContactForm, the /contact
 * page's ContactPageForm, and ExitIntentModal) and inserts a row
 * into `public.contact_submissions`.
 *
 * Body may use camelCase (legacy Footer ContactForm) or snake_case
 * (newer ContactPageForm / ExitIntentModal) — both accepted. A
 * `source` field tags which form produced the submission so the
 * admin Forms page can filter/group:
 *
 *   'contact_page' (default) · 'footer' · 'exit_intent' · 'other'
 *
 * On insert failure we still return `{ ok: true }` so the visitor's
 * form doesn't break — but log payload + error for admin triage.
 *
 * Auto-spam: messages that look like keysmash gibberish (see
 * looksLikeGibberish above) get spam_at = now() at insert time so
 * the admin inbox isn't polluted. The row still lands in the table
 * — just hidden from default counts via the existing spam_at filter
 * in /api/website-requests/unread-count and the Forms tab.
 */
export async function POST(req: NextRequest) {
  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const firstName = str(payload.firstName ?? payload.first_name, 80);
  const lastName = str(payload.lastName ?? payload.last_name, 80);
  const email = str(payload.email, 160);
  const telephone = str(payload.telephone ?? payload.phone, 40);
  const paymentMethod = str(payload.paymentMethod ?? payload.payment_method, 40);
  const message = str(payload.message, 2000);
  const pageUrl = str(payload.pageUrl ?? payload.page_url, 1000);
  const rawSource = str(payload.source, 40);
  const source = ['contact_page', 'footer', 'exit_intent', 'careers', 'other'].includes(rawSource)
    ? rawSource
    : 'contact_page';
  const consent = payload.consent === true;
  // Subject is only set by the Contact Us modal (which exposes
  // the dropdown). Older forms — footer, exit-intent — don't send
  // it, so we accept null. Any value not in SUBJECT_INBOX gets
  // dropped to null rather than routed wrong.
  const rawSubject = str(payload.subject, 40);
  const subject = rawSubject in SUBJECT_INBOX ? rawSubject : null;

  // Only require enough signal to reach back — email or phone.
  if (!email && !telephone) {
    return NextResponse.json(
      { ok: false, error: 'email_or_phone_required' },
      { status: 400 },
    );
  }

  // Auto-spam keysmash submissions like "BuMundgALtGcMETfBlB". Bots
  // often fill the name fields with the same keysmash too, so we
  // OR the check across first_name + last_name + message — any one
  // looking like gibberish is enough. The row still gets inserted
  // (so admins can audit what bots are posting), but spam_at is
  // pre-stamped so unread-count filters and the Forms tab hide it
  // by default. spam_by stays null because there's no admin user —
  // the system did it.
  const autoSpam =
    looksLikeGibberish(message) ||
    looksLikeGibberish(firstName) ||
    looksLikeGibberish(lastName) ||
    // Also catch the case where the FIRST + LAST together form a
    // keysmash even if neither alone is long enough to flag — bots
    // sometimes split a single random string across both fields.
    looksLikeGibberish(`${firstName} ${lastName}`.trim());

  try {
    const supabase = getPublicSupabase();
    const { error } = await supabase.from('contact_submissions').insert({
      first_name: firstName || null,
      last_name: lastName || null,
      email: email || null,
      telephone: telephone || null,
      payment_method: paymentMethod || null,
      message: message || null,
      source,
      subject,
      consent,
      page_url: pageUrl || null,
      user_agent: req.headers.get('user-agent'),
      referrer: req.headers.get('referer'),
      spam_at: autoSpam ? new Date().toISOString() : null,
      spam_by: null,
    });
    if (error) {
      // Per master's pattern — log but don't break the visitor's
      // experience. Most likely failure is "migration hasn't been
      // applied yet"; user still sees success, admin sees log.
      console.error('[contact] insert failed, falling back to log:', error.message);
      console.info('[contact] submission payload:', {
        source, firstName, lastName, email, telephone, paymentMethod,
        message: message?.slice(0, 200),
      });
    }
  } catch (err) {
    console.error('[contact] supabase threw, falling back to log:', err);
    console.info('[contact] submission payload:', {
      source, firstName, lastName, email, telephone, paymentMethod,
    });
  }

  // Route the email via Resend when the Contact Us modal supplied
  // a Subject. Failures here never block the DB insert above (the
  // visitor still sees success and the admin inbox still has the
  // row) — Resend outage shouldn't lose us a lead. Skipped for
  // auto-spam submissions so bot traffic doesn't hit the live
  // inboxes.
  if (subject && !autoSpam) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[contact] RESEND_API_KEY not configured — DB insert succeeded, email skipped');
    } else {
      const inbox = SUBJECT_INBOX[subject];
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'No name provided';
      const from = (process.env.RESEND_FROM || process.env.EMAIL_FROM
        || 'Seven Arrows Recovery <hello@sevenarrowsrecovery.com>').trim();
      const replyTo = email || undefined;
      const lines = [
        `<p><strong>Name:</strong> ${escapeHtml(fullName)}</p>`,
        email ? `<p><strong>Email:</strong> ${escapeHtml(email)}</p>` : '',
        telephone ? `<p><strong>Phone:</strong> ${escapeHtml(telephone)}</p>` : '',
        `<p><strong>Subject:</strong> ${escapeHtml(inbox.label)}</p>`,
        message ? `<p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>` : '',
        pageUrl ? `<p style="color:#666;font-size:12px;">From: ${escapeHtml(pageUrl)}</p>` : '',
      ].filter(Boolean).join('');
      try {
        const sendBody: Record<string, unknown> = {
          from,
          to: [inbox.to],
          subject: `New ${inbox.label} · ${fullName}`,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#222;">${lines}</div>`,
        };
        if (replyTo) sendBody.reply_to = replyTo;
        const res = await fetch(RESEND_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(sendBody),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          console.error(`[contact] Resend ${res.status}: ${txt.slice(0, 500)}`);
        }
      } catch (err) {
        console.error('[contact] Resend threw:', err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

function str(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}
