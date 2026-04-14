import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/claude/job-description/from-pdf — accept a multipart-form PDF
// upload, hand it to Claude, and return structured job-description data
// plus any assignee names mentioned in the document so the browser can
// create a row and link team members.
//
// Required env: ANTHROPIC_API_KEY
// Optional env: ANTHROPIC_MODEL (defaults to claude-opus-4-6)

const DEFAULT_MODEL = 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

// Guard against memory blow-ups from oversized uploads (25 MB is well above
// any real job description PDF and well under Anthropic's per-request cap).
const MAX_BYTES = 25 * 1024 * 1024;

type Extracted = {
  title: string;
  department: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  assignees: string[];
};

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file field is required' }, { status: 400 });
  }

  if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: 'PDF too large (max 25 MB)' }, { status: 413 });
  }
  const base64 = buf.toString('base64');

  const prompt = `You are parsing a job description PDF for Seven Arrows Recovery (a residential behavioral-health and substance-use treatment facility in Arizona using equine-assisted, trauma-informed care).

Extract the role into this exact JSON shape — no prose, no markdown fences:
{
  "title": "<job title as written>",
  "department": "<department name if stated, else empty string>",
  "summary": "<2-4 sentence position summary>",
  "responsibilities": ["<responsibility 1>", "<responsibility 2>", ...],
  "requirements": ["<requirement 1>", "<requirement 2>", ...],
  "assignees": ["<full name of any specific person named in the document as holding this role>", ...]
}

Rules:
- Keep original title wording (including slashes, parentheses, region suffixes).
- Use plain text in each string (no markdown, no bullet characters, no trailing colons).
- Responsibilities: include every distinct duty from the PDF as its own item; one sentence each. Do not combine multiple duties.
- Requirements: include education, licenses, certifications, experience, and skills.
- assignees: ONLY include real human names explicitly identified as the holder(s) of this role. Do NOT include the supervisor "Reports To" name — only the person filling the role. If none are named, return an empty array.`;

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
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Anthropic API error (${res.status}): ${text}` },
        { status: res.status }
      );
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
      .trim();

    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed: Partial<Extracted>;
    try {
      parsed = JSON.parse(cleaned) as Partial<Extracted>;
    } catch {
      return NextResponse.json(
        { error: 'Could not parse Claude output as JSON.', raw: text },
        { status: 502 }
      );
    }

    const result: Extracted = {
      title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
      department: typeof parsed.department === 'string' ? parsed.department.trim() : '',
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
      responsibilities: Array.isArray(parsed.responsibilities)
        ? parsed.responsibilities.filter((r): r is string => typeof r === 'string' && r.trim() !== '').map((r) => r.trim())
        : [],
      requirements: Array.isArray(parsed.requirements)
        ? parsed.requirements.filter((r): r is string => typeof r === 'string' && r.trim() !== '').map((r) => r.trim())
        : [],
      assignees: Array.isArray(parsed.assignees)
        ? parsed.assignees.filter((n): n is string => typeof n === 'string' && n.trim() !== '').map((n) => n.trim())
        : [],
    };

    if (!result.title) {
      return NextResponse.json(
        { error: 'Could not identify a job title in the PDF.' },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
