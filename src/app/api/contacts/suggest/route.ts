import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/contacts/suggest — asks Claude to research candidate
// contacts the admissions team might want to add to the outreach
// sheet. Server pulls the existing roster so Claude can dedupe
// against what's already there and slot suggestions into the same
// categories. Response is a JSON array of `{ name, company,
// company_website, type, specialty, role, location, notes }` shapes
// the modal can show with a checkbox per row.
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
  location: string | null;
  notes: string | null;
}

export const dynamic = 'force-dynamic';
// Claude calls take longer than the default 10s edge timeout.
export const maxDuration = 60;

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

Your job: suggest realistic candidate CONTACTS the admissions team might add to their CRM. Every suggestion must look like a plausible real-world referrer or clinical partner — never invent obvious fakes. Lean on common, well-known classes of orgs and roles. When in doubt, leave optional fields null instead of fabricating specifics.

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
      "location": "City, ST or null",
      "notes": "Short reason this contact is worth pursuing — 1–2 sentences"
    }
  ]
}`;

  const userMessage = `Existing outreach roster (so you don't duplicate; match this style):
${rosterBlock}

${userPrompt ? `Additional steer from admissions: ${userPrompt}\n\n` : ''}Suggest ${requested} new candidate contacts that complement the existing roster. Bias toward variety across type (Detox / PHP / IOP) and geography. Return ONLY the JSON object described in the system prompt.`;

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
        // Scale token budget with the request count so 50 candidates
        // have room — each suggestion is ~120–180 tokens.
        max_tokens: Math.min(8000, 1000 + requested * 180),
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
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
          location: typeof c.location === 'string' && c.location.trim() ? c.location.trim().slice(0, 200) : null,
          notes: typeof c.notes === 'string' && c.notes.trim() ? c.notes.trim().slice(0, 4000) : null,
        });
      }
    }

    return NextResponse.json({ contacts: cleaned });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
