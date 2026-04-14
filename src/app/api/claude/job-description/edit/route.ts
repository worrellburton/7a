import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/claude/job-description/edit — take the current job-description
// fields plus a natural-language instruction and return an updated version.
// The server holds the API key; the client only sends the role content and
// the edit request.
//
// Required env: ANTHROPIC_API_KEY
// Optional env: ANTHROPIC_MODEL (defaults to claude-opus-4-6)

const DEFAULT_MODEL = 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

type EditBody = {
  title?: string;
  department?: string | null;
  summary?: string;
  responsibilities?: string[];
  requirements?: string[];
  instruction?: string;
};

type Edited = {
  title: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
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

  const body = (await req.json()) as EditBody;
  const instruction = (body.instruction || '').trim();
  if (!instruction) {
    return NextResponse.json({ error: 'instruction is required' }, { status: 400 });
  }
  const title = (body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const current = {
    title,
    department: (body.department || '').trim(),
    summary: body.summary || '',
    responsibilities: Array.isArray(body.responsibilities) ? body.responsibilities : [],
    requirements: Array.isArray(body.requirements) ? body.requirements : [],
  };

  const prompt = `You are editing a job description for Seven Arrows Recovery — a residential behavioral-health and substance-use treatment facility in Arizona that uses equine-assisted, trauma-informed care.

Current job description (JSON):
${JSON.stringify(current, null, 2)}

User's edit request:
"""
${instruction}
"""

Apply the user's request and return the COMPLETE updated job description. Preserve everything not implicated by the request.

Respond with ONLY a single JSON object — no prose, no markdown fences — matching this exact shape:
{
  "title": "<role title>",
  "summary": "<2-4 sentence position summary>",
  "responsibilities": ["<responsibility 1>", "<responsibility 2>", ...],
  "requirements": ["<requirement 1>", "<requirement 2>", ...]
}

Rules:
- Keep plain text in each string (no markdown, no bullet characters, no trailing colons).
- Each responsibility is one sentence; do not combine multiple duties.
- Requirements cover credentials, experience, skills, and personal attributes.
- If the user asks to change the title, update it; otherwise keep the existing title verbatim.
- Return every responsibility and requirement that should remain — this replaces the current lists entirely.`;

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
        messages: [{ role: 'user', content: prompt }],
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
    let parsed: Partial<Edited>;
    try {
      parsed = JSON.parse(cleaned) as Partial<Edited>;
    } catch {
      return NextResponse.json(
        { error: 'Could not parse Claude output as JSON.', raw: text },
        { status: 502 }
      );
    }

    const result: Edited = {
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : current.title,
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : current.summary,
      responsibilities: Array.isArray(parsed.responsibilities)
        ? parsed.responsibilities.filter((r): r is string => typeof r === 'string' && r.trim() !== '').map((r) => r.trim())
        : current.responsibilities,
      requirements: Array.isArray(parsed.requirements)
        ? parsed.requirements.filter((r): r is string => typeof r === 'string' && r.trim() !== '').map((r) => r.trim())
        : current.requirements,
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
