import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/contacts/import/normalise
//
// Hands the raw CSV to Claude and asks for a clean array of contact
// records that match our canonical schema. Useful when the source
// CSV has messy headers ("Phone #", "What they do" for role, "City"
// for location, etc.) — the prompt teaches Claude the exact field
// names and Claude returns the normalised records as JSON. The
// /import endpoint re-validates everything before insert, so a bad
// answer here can't bypass the constraint.
//
// Big CSVs would otherwise overflow Claude's max_tokens and come
// back as a truncated, unparseable JSON object. We split the parsed
// rows into chunks, send each chunk separately, and merge the
// returned `rows[]` arrays.
//
// Body:  { csv: string, model?: string }
// Returns: { rows: ContactInput[], notes?: string }

export const dynamic = 'force-dynamic';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

const CHUNK_SIZE = 40;

const SCHEMA_PROMPT = `You are normalising a CSV of CRM contacts (referrers, leads,
prospective partners) for Seven Arrows Recovery's admissions team
into the exact JSON shape their "contacts" table accepts. Your
entire response MUST be a single JSON object — no prose before or
after, no markdown code fences, no explanation. Begin your response
with the literal character { and end it with }. The object must
match this TypeScript type:

  {
    "rows": Contact[],
    "notes": string  // brief summary of what you cleaned up; one sentence max
  }

Where Contact is:

  {
    "name": string,                 // required; "First Last"
    "role": string | null,          // role / relation, e.g. "Therapist", "Family", "Interventionist"
    "phone": string | null,         // primary phone
    "email": string | null,
    "location": string | null,      // "City, ST" preferred
    "notes": string | null
  }

Rules:
  * If a CSV column is ambiguous, use your best judgement; explain in "notes" if you had to guess on more than one row.
  * Convert phone numbers to "(NNN) NNN-NNNN" when possible. Strip extensions into notes if useful.
  * If first / last names are split across columns, combine them into "name".
  * Skip rows that don't have at least a recognisable name — don't invent data.
  * Never include rows with empty required fields.
  * Trim trailing whitespace and collapse repeated spaces.

The CSV follows after the next line. Output JSON only.`;

interface ClaudeResponse {
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string;
  error?: { message?: string };
}

function parseCsv(text: string): { header: string; lines: string[] } {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      cur += c;
      if (c === '"' && text[i + 1] !== '"') inQuotes = false;
      else if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      continue;
    }
    if (c === '"') { cur += c; inQuotes = true; continue; }
    if (c === '\r') continue;
    if (c === '\n') {
      if (cur.length > 0 || out.length > 0) out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.length > 0) out.push(cur);
  if (out.length === 0) return { header: '', lines: [] };
  const [header, ...rest] = out;
  return { header, lines: rest.filter((l) => l.trim().length > 0) };
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

async function callClaude(apiKey: string, model: string, csvChunk: string): Promise<{ rows: unknown[]; notes?: string; error?: string }> {
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
      messages: [
        { role: 'user', content: `${SCHEMA_PROMPT}\n\nCSV:\n${csvChunk}` },
      ],
    }),
  });

  const json = (await res.json().catch(() => ({}))) as ClaudeResponse;
  if (!res.ok) {
    return { rows: [], error: json.error?.message || `Claude returned ${res.status}` };
  }
  if (json.stop_reason === 'max_tokens') {
    return { rows: [], error: 'Claude truncated mid-response — chunk smaller.' };
  }
  const text = json.content?.find((c) => c.type === 'text')?.text ?? '';
  const candidate = extractJsonObject(text);
  if (!candidate) {
    return { rows: [], error: 'Claude returned no JSON object.' };
  }
  let parsed: { rows?: unknown; notes?: unknown } | null = null;
  try { parsed = JSON.parse(candidate); } catch { /* ignore */ }
  if (!parsed || !Array.isArray(parsed.rows)) {
    return { rows: [], error: 'Claude JSON had no rows[] array.' };
  }
  return {
    rows: parsed.rows,
    notes: typeof parsed.notes === 'string' ? parsed.notes : undefined,
  };
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
  if (csv.length > 600_000) {
    return NextResponse.json({ error: 'CSV is too large for AI normalisation (>600KB) — split it.' }, { status: 413 });
  }

  const model = body.model || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const { header, lines } = parseCsv(csv);
  if (lines.length === 0) {
    return NextResponse.json({ error: 'CSV had no data rows.' }, { status: 400 });
  }
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
    chunks.push(`${header}\n${lines.slice(i, i + CHUNK_SIZE).join('\n')}`);
  }

  const MAX_CONCURRENT = 3;
  const allRows: unknown[] = [];
  const allNotes: string[] = [];
  const errors: string[] = [];
  for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
    const slice = chunks.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.all(slice.map((c) => callClaude(apiKey, model, c)));
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const chunkNum = i + j + 1;
      if (r.error) {
        errors.push(`Chunk ${chunkNum}: ${r.error}`);
        continue;
      }
      allRows.push(...r.rows);
      if (r.notes) allNotes.push(r.notes);
    }
  }

  if (allRows.length === 0) {
    return NextResponse.json(
      { error: errors.length > 0 ? `Claude couldn't normalise the CSV. ${errors.slice(0, 3).join(' · ')}` : 'Claude returned no rows.' },
      { status: 502 },
    );
  }

  return NextResponse.json({
    rows: allRows,
    notes:
      (allNotes.length > 0 ? allNotes[0] : '') +
      (errors.length > 0 ? ` (${errors.length} of ${chunks.length} chunks failed — review manually)` : ''),
  });
}
