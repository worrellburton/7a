import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/partnerships/import/normalise
//
// Hands raw CSV text to Claude and asks for a clean array of partner
// records that match our canonical schema. Useful when the source
// CSV has messy headers ("Phone #", "Cash rate / day", "What they
// take" for insurance, etc.) — the prompt teaches Claude the exact
// field names + the conditional Levels-of-care rule, and Claude
// returns the normalised records as JSON. The /import endpoint
// re-validates everything before insert, so a bad answer here can't
// bypass the constraint.
//
// Body:  { csv: string, model?: string }
// Returns: { rows: PartnerInput[], notes?: string }

export const dynamic = 'force-dynamic';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

const SCHEMA_PROMPT = `You are normalising a CSV of clinical-partner data for Seven Arrows
Recovery's admissions team into the exact JSON shape their
"partners" table accepts. Output ONLY a JSON object — no prose, no
markdown — matching this TypeScript type:

  {
    "rows": Partner[],
    "notes": string  // brief summary of what you cleaned up; one sentence max
  }

Where Partner is:

  {
    "name": string,                 // required
    "type": "Detox" | "RTC" | "Outpatient" | "Extended Care" | "Interventionist" | "Therapist",  // required
    "specialty": string | null,
    "location": string | null,      // "City, ST" preferred
    "poc": string | null,           // point of contact name
    "contact_info": string | null,  // email + phone, free text
    "admissions_line": string | null, // primary phone for admissions
    "cash_pay_rate": number | null, // USD per day, integer
    "insurance": string[],          // carriers accepted, deduped
    "levels_of_care": string[] | null, // ONLY allowed when type is one of Detox/RTC/Outpatient/Extended Care; null otherwise
    "website": string | null,
    "notes": string | null,
    "comments": string | null,
    "rep": string | null            // our point person internally
  }

Rules:
  * If a CSV column is ambiguous, use your best judgement; explain in "notes" if you had to guess on more than one row.
  * Convert phone numbers to "(NNN) NNN-NNNN" when possible.
  * Normalise insurance / levels_of_care to short canonical names (e.g. "BCBS", "Aetna", "PHP", "IOP", "Detox", "Residential").
  * For "type", coerce common synonyms: "outpatient program" → "Outpatient", "residential" / "primary" → "RTC", "sober living" / "transitional" → "Extended Care", "interventionist" stays, "therapist" / "clinician" → "Therapist".
  * Skip rows that don't have at least a recognisable name + type — don't invent data.
  * For non-facility types (Interventionist, Therapist), set levels_of_care to null even if the CSV has values for it.
  * Never include rows with empty required fields.

The CSV follows after the next line. Output JSON only.`;

interface ClaudeResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
  }

  let body: { csv?: string; model?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const csv = typeof body.csv === 'string' ? body.csv : '';
  if (!csv.trim()) return NextResponse.json({ error: 'csv body is empty' }, { status: 400 });
  // Cap at ~250KB so a runaway file doesn't tie up Claude / our budget.
  if (csv.length > 250_000) {
    return NextResponse.json({ error: 'CSV is too large for AI normalisation (>250KB) — split it.' }, { status: 413 });
  }

  const model = body.model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      // Encourage strict JSON output by asking the model to start
      // its reply with a `{` (Anthropic's recommended prefill pattern).
      messages: [
        { role: 'user', content: `${SCHEMA_PROMPT}\n\nCSV:\n${csv}` },
        { role: 'assistant', content: '{' },
      ],
    }),
  });

  const json = (await res.json().catch(() => ({}))) as ClaudeResponse;
  if (!res.ok) {
    return NextResponse.json(
      { error: json.error?.message || `Claude returned ${res.status}` },
      { status: 500 },
    );
  }

  const text = json.content?.find((c) => c.type === 'text')?.text ?? '';
  // We prefilled the assistant message with `{`, so the response
  // starts after it. Reattach.
  const completed = `{${text}`;
  let parsed: { rows?: unknown; notes?: unknown } | null = null;
  try {
    parsed = JSON.parse(completed);
  } catch {
    // The model occasionally adds a trailing prose line. Try
    // trimming everything after the last `}`.
    const lastBrace = completed.lastIndexOf('}');
    if (lastBrace !== -1) {
      try { parsed = JSON.parse(completed.slice(0, lastBrace + 1)); } catch { /* fall through */ }
    }
  }
  if (!parsed || !Array.isArray(parsed.rows)) {
    return NextResponse.json(
      { error: 'Claude returned an unparseable response; try a smaller / cleaner CSV.' },
      { status: 502 },
    );
  }

  return NextResponse.json({
    rows: parsed.rows,
    notes: typeof parsed.notes === 'string' ? parsed.notes : undefined,
  });
}
