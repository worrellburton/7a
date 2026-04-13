import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/claude/job-description — generate a structured job description
// using the Anthropic Messages API. The server holds the API key; the
// browser sends only role metadata (title, department, optional summary).
//
// Required env:
//   ANTHROPIC_API_KEY — your Anthropic API key.
//
// Optional env:
//   ANTHROPIC_MODEL — override the default model id.

const DEFAULT_MODEL = 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

type GenerateBody = {
  title?: string;
  department?: string | null;
  existingSummary?: string | null;
};

type GeneratedJobDescription = {
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

  const body = (await req.json()) as GenerateBody;
  const title = (body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  const department = (body.department || '').trim();
  const existingSummary = (body.existingSummary || '').trim();

  const context = [
    `Organization: Seven Arrows Recovery — a residential behavioral-health and substance-use treatment facility in Arizona that uses equine-assisted therapy and trauma-informed care.`,
    `Job title: ${title}`,
    department ? `Department: ${department}` : '',
    existingSummary ? `Existing summary to build on: ${existingSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `${context}

Write a concise, realistic job description for this role at Seven Arrows Recovery.

Respond with ONLY a single JSON object — no prose, no markdown fences — matching this exact shape:
{
  "summary": "<2–4 sentence overview of the role and its purpose>",
  "responsibilities": ["<responsibility 1>", "<responsibility 2>", ...],
  "requirements": ["<requirement 1>", "<requirement 2>", ...]
}

Guidelines:
- Provide 5–8 responsibilities, each a single sentence, imperative mood.
- Provide 4–7 requirements covering credentials, experience, skills, and personal attributes relevant to a behavioral-health setting.
- Tailor the language to the department context when one is provided.
- Reflect trauma-informed, recovery-oriented values where appropriate.
- Use plain text (no markdown, no bullet characters) inside each string.`;

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
        max_tokens: 1024,
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

    // Strip any accidental code fences, then parse.
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed: GeneratedJobDescription;
    try {
      parsed = JSON.parse(cleaned) as GeneratedJobDescription;
    } catch {
      return NextResponse.json(
        { error: 'Could not parse generated JSON.', raw: text },
        { status: 502 }
      );
    }

    const result: GeneratedJobDescription = {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      responsibilities: Array.isArray(parsed.responsibilities)
        ? parsed.responsibilities.filter((r): r is string => typeof r === 'string')
        : [],
      requirements: Array.isArray(parsed.requirements)
        ? parsed.requirements.filter((r): r is string => typeof r === 'string')
        : [],
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
