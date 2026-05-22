import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/contacts/suggest — asks Claude to research candidate
// contacts the admissions team might want to add to the outreach
// sheet. Server pulls the existing roster so Claude can dedupe
// against what's already there and slot suggestions into the same
// categories.
//
// Claude is given the web_search tool so it can verify each org
// exists and pull a real, public phone + email instead of guessing
// from training data. The agentic loop runs server-side on
// Anthropic's end; we just receive the final text block and parse
// the embedded JSON.
//
// Response shape: { contacts, complete, partial, missingCount,
// totalReturned } so the modal can split candidates that have full
// contact info from candidates where the search couldn't surface
// one of the two fields. The /api/contacts/bulk endpoint accepts
// phone + email so the rows land complete.
//
// We hold ANTHROPIC_API_KEY server-side; the browser never sees it.

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

interface SuggestBody {
  // Free-text steer the admin can type into the modal — "focus on
  // Arizona detox facilities", "alumni who could refer", etc.
  prompt?: string;
  // How many candidates to ask for. Capped server-side so a
  // runaway value can't blow through tokens.
  count?: number;
}

interface SuggestedContact {
  name: string;
  company: string | null;
  company_website: string | null;
  type: string[] | null;
  specialty: string | null;
  role: string | null;
  // Phone + email are required by the admissions workflow — the
  // sheet is useless without a way to reach the contact. Claude is
  // told to skip a candidate entirely if it can't surface both with
  // reasonable confidence, but if a partial slips through we keep
  // it and tag the gap in `missing` so the modal can flag it.
  phone: string | null;
  email: string | null;
  location: string | null;
  notes: string | null;
  missing: Array<'phone' | 'email'>;
}

export const dynamic = 'force-dynamic';
// Claude calls take longer than the default 10s edge timeout, and
// web-search-grounded research stretches that further — give the
// agentic loop room to do 3–8 lookups before timing out.
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 500 },
    );
  }

  let body: SuggestBody = {};
  try { body = (await req.json()) as SuggestBody; } catch { /* allow empty */ }
  const userPrompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 800) : '';
  const requested = Math.min(Math.max(body.count ?? 8, 1), 50);

  // Pull the existing roster so Claude can dedupe + match style.
  const admin = getAdminSupabase();
  const { data: existing } = await admin
    .from('contacts')
    .select('name, company, type, specialty, role, location')
    .order('updated_at', { ascending: false })
    .limit(120);

  const rosterLines = (existing ?? []).map((r) => {
    const parts = [
      (r.name as string) ?? '',
      r.company ? `(${r.company})` : '',
      r.type ? `[${r.type}]` : '',
      r.specialty ? `· ${r.specialty}` : '',
      r.location ? `— ${r.location}` : '',
    ].filter(Boolean);
    return parts.join(' ');
  });
  const rosterBlock = rosterLines.length
    ? rosterLines.join('\n')
    : '(none yet — the sheet is empty)';

  const systemPrompt = `You are an outreach research assistant for Seven Arrows Recovery, a boutique residential addiction-treatment ranch in Cochise County, Arizona. Seven Arrows is trauma-informed, equine-assisted, holistic, and evidence-based; admissions builds relationships with referrers (therapists, interventionists, detoxes, IOP/PHP step-down programs) who send the right clients.

Your job: suggest realistic candidate CONTACTS the admissions team might add to their CRM. Every suggestion must be a REAL organization or person you can verify by searching the web. Never invent fakes. Lean on common, well-known classes of orgs and roles. When in doubt, leave optional fields null instead of fabricating specifics.

USE THE web_search TOOL. For each candidate, run a web search to confirm the org exists, find their public-facing intake / referral / contact line, and find a public email address (intake@…, admissions@…, info@…, or a named clinician's listed practice email). Do not rely solely on training data — phone numbers and email addresses change, and you must surface CURRENT, REAL contact info. Two to three searches per candidate is a reasonable budget; favor the org's own site, Psychology Today profiles, official directory listings, and state licensing boards over third-party data brokers.

CRITICAL — admissions needs to actually CALL or EMAIL these people. Every candidate MUST come with a phone number AND an email address that web search confirmed. If web search cannot surface either:
  - Prefer to SKIP that candidate and pick a different real organization where contact info IS publicly listed (a clinic's intake line, an interventionist's published practice email, a state-licensed therapist's directory entry, etc.).
  - If you keep a candidate where only one of the two is recoverable, set the unknown one to null AND list it inside "missing" so the admin can see the gap. Never fabricate a phone number or email — if you didn't see it on a real page, it goes in "missing".

Output STRICT JSON only — no prose, no markdown fences. Shape:

{
  "contacts": [
    {
      "name": "Full name of person OR org if no individual is known",
      "company": "Organization name or null",
      "company_website": "https://… or null",
      "type": string[] | null,  // one or more of: "Detox", "PHP", "IOP", "RTC", "Outpatient", "Extended Care", "Interventionist", "Therapist" — pick every offering that applies (e.g. ["Detox","RTC"] for a facility with both tracks)
      "specialty": "Trauma · Eating Disorders · Dual Diagnosis · Family · etc. or null",
      "role": "Therapist | Interventionist | Owner | Admissions | etc. or null",
      "phone": "+1 555 123 4567 or main intake line, real and verifiable, or null if unknown",
      "email": "intake@example.org or known practice address, real and verifiable, or null if unknown",
      "location": "City, ST or null",
      "notes": "Short reason this contact is worth pursuing — 1–2 sentences",
      "missing": []  // include "phone" and/or "email" here when those fields are null
    }
  ]
}`;

  const userMessage = `Existing outreach roster (so you don't duplicate; match this style):
${rosterBlock}

${userPrompt ? `Additional steer from admissions: ${userPrompt}\n\n` : ''}Suggest ${requested} new candidate contacts that complement the existing roster. Bias toward variety across type (Detox / PHP / IOP) and geography. Use the web_search tool to confirm each org exists and to pull a real, public-facing phone + email before listing them. Return ONLY the JSON object described in the system prompt at the end.`;

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        // Token budget scales with the request count (each suggestion
        // is ~120–180 tokens of JSON) AND with the web-search budget
        // (search results live in context). Generous ceiling so a
        // 50-candidate run with verification doesn't truncate.
        max_tokens: Math.min(16000, 2000 + requested * 240),
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        // Web search tool — Anthropic-hosted; runs the search loop
        // server-side and returns final text once the model is
        // satisfied with what it found. max_uses caps cost; 4–8
        // searches per candidate would be excessive, so the budget
        // here is shared across the whole batch and scales with
        // request count.
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: Math.min(40, Math.max(8, requested * 2)),
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Anthropic API error (${res.status}): ${text}` },
        { status: res.status },
      );
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const raw = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
      .trim();

    // Be forgiving of stray prose around the JSON: pull the first {…}
    // block out. If parsing fails, return the raw text for debugging
    // instead of crashing the modal.
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      return NextResponse.json(
        { error: 'Claude did not return JSON.', raw },
        { status: 502 },
      );
    }
    let parsed: { contacts?: unknown };
    try {
      parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as { contacts?: unknown };
    } catch (e) {
      return NextResponse.json(
        { error: `Couldn't parse Claude's JSON: ${String(e)}`, raw },
        { status: 502 },
      );
    }

    const cleaned: SuggestedContact[] = [];
    if (Array.isArray(parsed.contacts)) {
      for (const c of parsed.contacts as Array<Record<string, unknown>>) {
        const name = typeof c.name === 'string' ? c.name.trim() : '';
        if (!name) continue;
        cleaned.push({
          name: name.slice(0, 200),
          company: typeof c.company === 'string' && c.company.trim() ? c.company.trim().slice(0, 200) : null,
          company_website: typeof c.company_website === 'string' && c.company_website.trim() ? c.company_website.trim().slice(0, 500) : null,
          type: (() => {
            // Claude may return type as a string ("Detox") or an array
            // (["Detox","RTC"]) — accept both, trim, dedupe, cap at
            // 60 chars per tag, collapse to null on empty.
            const raw: unknown[] = Array.isArray(c.type)
              ? (c.type as unknown[])
              : typeof c.type === 'string' ? c.type.split(',') : [];
            const seen = new Set<string>();
            const out: string[] = [];
            for (const v of raw) {
              if (typeof v !== 'string') continue;
              const t = v.trim().slice(0, 60);
              if (!t) continue;
              const key = t.toLowerCase();
              if (seen.has(key)) continue;
              seen.add(key);
              out.push(t);
            }
            return out.length === 0 ? null : out;
          })(),
          specialty: typeof c.specialty === 'string' && c.specialty.trim() ? c.specialty.trim().slice(0, 200) : null,
          role: typeof c.role === 'string' && c.role.trim() ? c.role.trim().slice(0, 200) : null,
          phone: typeof c.phone === 'string' && c.phone.trim() ? c.phone.trim().slice(0, 60) : null,
          email: typeof c.email === 'string' && c.email.trim() ? c.email.trim().slice(0, 200) : null,
          location: typeof c.location === 'string' && c.location.trim() ? c.location.trim().slice(0, 200) : null,
          notes: typeof c.notes === 'string' && c.notes.trim() ? c.notes.trim().slice(0, 4000) : null,
          // Derive `missing` from what actually came back rather than
          // trusting Claude's own list — keeps the badge honest if
          // the model says "missing": [] but also returned null.
          missing: (() => {
            const out: Array<'phone' | 'email'> = [];
            const phoneOk = typeof c.phone === 'string' && c.phone.trim().length > 0;
            const emailOk = typeof c.email === 'string' && c.email.trim().length > 0;
            if (!phoneOk) out.push('phone');
            if (!emailOk) out.push('email');
            return out;
          })(),
        });
      }
    }

    // Split the cleaned list so the modal can render the contacts
    // Claude actually surfaced phone+email for separately from the
    // partials. Admissions can opt in to the partials once they see
    // the count.
    const complete = cleaned.filter((c) => c.missing.length === 0);
    const partial = cleaned.filter((c) => c.missing.length > 0);

    return NextResponse.json({
      contacts: cleaned,
      complete,
      partial,
      missingCount: partial.length,
      totalReturned: cleaned.length,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
