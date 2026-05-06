import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/policies/import/normalise
//
// Hands the raw CSV to Claude and asks for a clean array of policy
// records that match our canonical schema. Useful when the source
// CSV has messy headers ("Policy No.", "Dept", "Body") — the prompt
// teaches Claude the exact field names AND the live list of section
// + department names so it can snap fuzzy values onto real ones. The
// /import endpoint re-validates everything before insert.
//
// Body:  { csv: string, model?: string }
// Returns: { rows: PolicyInput[], notes?: string }

export const dynamic = 'force-dynamic';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

// Policies carry full body text (often paragraphs), so each row uses
// far more tokens than a contact. Smaller chunks keep us under the
// 8K output budget with headroom for the `notes` field.
const CHUNK_SIZE = 8;

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

function buildSchemaPrompt(sections: string[], departments: string[]): string {
  const sectionList = sections.length > 0 ? sections.map((s) => `"${s}"`).join(', ') : '(none defined yet — propose one)';
  const deptList = departments.length > 0 ? departments.map((d) => `"${d}"`).join(', ') : '(none defined; leave department blank)';
  return `You are normalising a CSV of policy / procedure documents for Seven
Arrows Recovery into the exact JSON shape their "policies" table
accepts. Your entire response MUST be a single JSON object — no
prose before or after, no markdown code fences, no explanation.
Begin your response with the literal character { and end it with }.
The object must match this TypeScript type:

  {
    "rows": Policy[],
    "notes": string  // brief summary of what you cleaned up; one sentence max
  }

Where Policy is:

  {
    "section": string,                 // required; MUST be one of: ${sectionList}
    "name": string,                    // required; the policy/procedure title
    "policy_number": string | null,    // e.g. "HR-001", optional
    "content": string,                 // required; the full policy body. Preserve newlines as \\n.
    "purpose": string | null,
    "scope": string | null,
    "department": string | null,       // MUST be one of: ${deptList}, or null if unclear
    "date_created": string | null,     // YYYY-MM-DD
    "date_reviewed": string | null,    // YYYY-MM-DD
    "date_revised": string | null      // YYYY-MM-DD
  }

Rules:
  * Snap fuzzy section / department values onto the lists above. If a
    row's section can't be mapped to one of the listed sections, skip
    it and call it out in "notes".
  * Preserve the full body of the policy in "content" — don't truncate
    or paraphrase. Use \\n for line breaks and \\n\\n for paragraph breaks.
  * If "Purpose:" or "Scope:" sections are embedded in the body, lift
    them into purpose / scope and remove that prefix from content.
  * Skip rows that don't have at least a recognisable section + name + content.
  * Never include rows with empty required fields.
  * Don't invent data; leave optional fields null when uncertain.

The CSV follows after the next line. Output JSON only.`;
}

async function callClaude(apiKey: string, model: string, prompt: string, csvChunk: string): Promise<{ rows: unknown[]; notes?: string; error?: string }> {
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
        { role: 'user', content: `${prompt}\n\nCSV:\n${csvChunk}` },
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
  if (!candidate) return { rows: [], error: 'Claude returned no JSON object.' };
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
  if (csv.length > 1_000_000) {
    return NextResponse.json({ error: 'CSV is too large for AI normalisation (>1MB) — split it.' }, { status: 413 });
  }

  // Pull the live list of sections + departments so the prompt can
  // teach Claude to snap onto our actual taxonomy instead of inventing
  // new section names that the import endpoint would then drop.
  const admin = getAdminSupabase();
  const [{ data: secRows }, { data: deptRows }] = await Promise.all([
    admin.from('policy_sections').select('name').order('sort_order', { ascending: true }),
    admin.from('departments').select('name').eq('hidden', false),
  ]);
  const sections = (secRows ?? []).map((r) => (r as { name: string }).name).filter(Boolean);
  const departments = (deptRows ?? []).map((r) => (r as { name: string }).name).filter(Boolean);
  const prompt = buildSchemaPrompt(sections, departments);

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
    const results = await Promise.all(slice.map((c) => callClaude(apiKey, model, prompt, c)));
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
