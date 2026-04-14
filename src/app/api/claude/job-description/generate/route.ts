import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/claude/job-description/generate — generate a fresh job
// description from just a title (and optional department) by handing the
// request to Claude. Returns the same shape as /from-pdf so the client can
// reuse the same plumbing.
//
// Required env: ANTHROPIC_API_KEY
// Optional env: ANTHROPIC_MODEL (defaults to claude-opus-4-6)

const DEFAULT_MODEL = 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

type GenerateBody = {
  title?: string;
  department?: string | null;
};

type Generated = {
  title: string;
  department: string;
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

  const body = (await req.json().catch(() => ({}))) as GenerateBody;
  const title = (body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  const department = (body.department || '').trim();

  const prompt = `You are drafting a job description for Seven Arrows Recovery (a residential behavioral-health and substance-use treatment facility in Arizona using equine-assisted, trauma-informed care).

Produce a realistic, detailed job description for the role below.

Role: ${title}${department ? `\nDepartment: ${department}` : ''}

Return ONLY this JSON shape — no prose, no markdown fences:
{
  "title": "${title.replace(/"/g, '\\"')}",
  "department": "${department.replace(/"/g, '\\"')}",
  "summary": "<3-5 sentence position summary grounded in Seven Arrows' clinical + equine context>",
  "responsibilities": ["<responsibility 1>", "<responsibility 2>", ...],
  "requirements": ["<requirement 1>", "<requirement 2>", ...]
}

Rules:
- Keep the title exactly as given.
- Summary: 3-5 sentences, concrete, referencing trauma-informed residential care when it fits the role.
- Responsibilities: at least 8 distinct duties. One sentence each. No bullet characters, no markdown.
- Requirements: include education, licenses/certifications where applicable to this role in Arizona, experience range, and key skills. At least 6 items.
- Use plain text only.`;

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
    let parsed: Partial<Generated>;
    try {
      parsed = JSON.parse(cleaned) as Partial<Generated>;
    } catch {
      return NextResponse.json(
        { error: 'Could not parse Claude output as JSON.', raw: text },
        { status: 502 }
      );
    }

    const result: Generated = {
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : title,
      department: typeof parsed.department === 'string' ? parsed.department.trim() : department,
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
      responsibilities: Array.isArray(parsed.responsibilities)
        ? parsed.responsibilities.filter((r): r is string => typeof r === 'string' && r.trim() !== '').map((r) => r.trim())
        : [],
      requirements: Array.isArray(parsed.requirements)
        ? parsed.requirements.filter((r): r is string => typeof r === 'string' && r.trim() !== '').map((r) => r.trim())
        : [],
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
