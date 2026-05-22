// Shared "AI suggests contacts" plumbing used by:
//   * /api/contacts/suggest  — modal-triggered ad-hoc lookups
//   * /api/cron/contacts/auto-add — hourly Bobby cron that
//     alternates between Claude and Gemini
//
// The two callers share the system prompt, roster fetch, candidate
// cleanup, and the OK/Error response shape so the model swap is
// genuinely a single field on the request. The provider-specific
// pieces (auth, request shape, web-search vs google-search tool,
// response parsing) live in callClaude*/callGemini* below.

import type { SupabaseClient } from '@supabase/supabase-js';

export type SuggestProvider = 'claude' | 'gemini';

export interface SuggestedContact {
  name: string;
  company: string | null;
  company_website: string | null;
  type: string[] | null;
  specialty: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  notes: string | null;
  missing: Array<'phone' | 'email'>;
}

export interface ProviderCallOk {
  ok: true;
  contacts: unknown;
}
export interface ProviderCallErr {
  ok: false;
  error: string;
  raw?: string;
  status: number;
}
export type ProviderCallResult = ProviderCallOk | ProviderCallErr;

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_VERSION = '2023-06-01';
const CLAUDE_DEFAULT_MODEL = 'claude-sonnet-4-6';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-pro';

// ─── Roster ────────────────────────────────────────────────────────

interface RosterRow {
  name: string;
  company: string | null;
  type: unknown;
  specialty: string | null;
  role: string | null;
  location: string | null;
}

export async function loadRoster(admin: SupabaseClient): Promise<RosterRow[]> {
  const { data } = await admin
    .from('contacts')
    .select('name, company, type, specialty, role, location')
    .order('updated_at', { ascending: false })
    .limit(120);
  return (data ?? []) as RosterRow[];
}

// ─── Prompt ────────────────────────────────────────────────────────

export function buildSuggestSystemPrompt(): string {
  return `You are an outreach research assistant for Seven Arrows Recovery, a boutique residential addiction-treatment ranch in Cochise County, Arizona. Seven Arrows is trauma-informed, equine-assisted, holistic, and evidence-based; admissions builds relationships with referrers (therapists, interventionists, detoxes, IOP/PHP step-down programs) who send the right clients.

Your job: suggest realistic candidate CONTACTS the admissions team might add to their CRM. Every suggestion must be a REAL organization or person you can verify by searching the web. Never invent fakes. Lean on common, well-known classes of orgs and roles. When in doubt, leave optional fields null instead of fabricating specifics.

USE THE WEB-SEARCH TOOL. For each candidate, run a web search to confirm the org exists, find their public-facing intake / referral / contact line, and find a public email address (intake@…, admissions@…, info@…, or a named clinician's listed practice email). Do not rely solely on training data — phone numbers and email addresses change, and you must surface CURRENT, REAL contact info. Two to three searches per candidate is a reasonable budget; favor the org's own site, Psychology Today profiles, official directory listings, and state licensing boards over third-party data brokers.

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
}

export function buildSuggestUserMessage(opts: {
  roster: RosterRow[];
  userPrompt: string;
  requested: number;
}): string {
  const rosterLines = opts.roster.map((r) => {
    const parts = [
      r.name ?? '',
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
  return `Existing outreach roster (so you don't duplicate; match this style):
${rosterBlock}

${opts.userPrompt ? `Additional steer from admissions: ${opts.userPrompt}\n\n` : ''}Suggest ${opts.requested} new candidate contacts that complement the existing roster. Bias toward variety across type (Detox / PHP / IOP) and geography. Use the web-search tool to confirm each org exists and to pull a real, public-facing phone + email before listing them. Return ONLY the JSON object described in the system prompt at the end.`;
}

// ─── Claude provider ──────────────────────────────────────────────

export async function callClaudeForCandidates(args: {
  systemPrompt: string;
  userMessage: string;
  requested: number;
}): Promise<ProviderCallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: 'ANTHROPIC_API_KEY is not configured.', status: 500 };

  const model = process.env.ANTHROPIC_MODEL || CLAUDE_DEFAULT_MODEL;
  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': CLAUDE_API_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: Math.min(16000, 2000 + args.requested * 240),
      system: args.systemPrompt,
      messages: [{ role: 'user', content: args.userMessage }],
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: Math.min(40, Math.max(8, args.requested * 2)),
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Anthropic API error (${res.status}): ${text}`, status: res.status };
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const raw = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '')
    .join('')
    .trim();
  return parseProviderJson(raw, 'Claude');
}

// ─── Gemini provider ──────────────────────────────────────────────

export async function callGeminiForCandidates(args: {
  systemPrompt: string;
  userMessage: string;
  requested: number;
}): Promise<ProviderCallResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: 'GEMINI_API_KEY is not configured.', status: 500 };

  const model = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // Gemini's native googleSearch grounding runs server-side on
  // Google's end — model issues searches, ingests results, then
  // emits a final response. Mirrors the contract Anthropic's
  // web_search tool gives us on the Claude side.
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: args.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: args.userMessage }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 0.6,
        // 2.5 Pro tops out higher than this; cap at ~16k to match
        // the Claude path's response budget.
        maxOutputTokens: Math.min(16000, 2000 + args.requested * 240),
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Gemini API error (${res.status}): ${text.slice(0, 800)}`, status: res.status };
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text || '')
    .join('')
    .trim();
  return parseProviderJson(raw, 'Gemini');
}

// ─── Shared JSON parsing + cleanup ────────────────────────────────

function parseProviderJson(raw: string, providerLabel: string): ProviderCallResult {
  if (!raw) return { ok: false, error: `${providerLabel} returned an empty response.`, raw, status: 502 };
  // Strip a leading ```json fence and trailing ``` if the model
  // ignored "no markdown" — common with both Claude and Gemini
  // when the grounded response is long.
  let s = raw;
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  const jsonStart = s.indexOf('{');
  const jsonEnd = s.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    return { ok: false, error: `${providerLabel} did not return JSON.`, raw, status: 502 };
  }
  try {
    const parsed = JSON.parse(s.slice(jsonStart, jsonEnd + 1)) as { contacts?: unknown };
    return { ok: true, contacts: parsed.contacts };
  } catch (e) {
    return { ok: false, error: `Couldn't parse ${providerLabel}'s JSON: ${String(e)}`, raw, status: 502 };
  }
}

export function cleanSuggestedContacts(rawContacts: unknown): SuggestedContact[] {
  const out: SuggestedContact[] = [];
  if (!Array.isArray(rawContacts)) return out;
  for (const c of rawContacts as Array<Record<string, unknown>>) {
    const name = typeof c.name === 'string' ? c.name.trim() : '';
    if (!name) continue;
    out.push({
      name: name.slice(0, 200),
      company: trim(c.company, 200),
      company_website: trim(c.company_website, 500),
      type: normaliseTypeArray(c.type),
      specialty: trim(c.specialty, 200),
      role: trim(c.role, 200),
      phone: trim(c.phone, 60),
      email: trim(c.email, 200),
      location: trim(c.location, 200),
      notes: trim(c.notes, 4000),
      missing: (() => {
        const missing: Array<'phone' | 'email'> = [];
        const phoneOk = typeof c.phone === 'string' && c.phone.trim().length > 0;
        const emailOk = typeof c.email === 'string' && c.email.trim().length > 0;
        if (!phoneOk) missing.push('phone');
        if (!emailOk) missing.push('email');
        return missing;
      })(),
    });
  }
  return out;
}

function trim(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function normaliseTypeArray(value: unknown): string[] | null {
  const raw: unknown[] = Array.isArray(value)
    ? value
    : typeof value === 'string' ? value.split(',') : [];
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
}
