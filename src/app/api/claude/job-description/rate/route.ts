import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/claude/job-description/rate — take the current job-description
// fields and return a score out of 10 plus recommendations to reach 10.

const DEFAULT_MODEL = 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

type RateBody = {
  title?: string;
  department?: string | null;
  summary?: string;
  responsibilities?: string[];
  requirements?: string[];
};

type RatingResult = {
  score: number;
  headline: string;
  strengths: string[];
  recommendations: string[];
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

  const body = (await req.json()) as RateBody;
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

  const prompt = `You are evaluating a job description for Seven Arrows Recovery — a residential behavioral-health and substance-use treatment facility in Arizona that uses equine-assisted, trauma-informed care.

Job description to rate (JSON):
${JSON.stringify(current, null, 2)}

Rate it on a scale of 0–10 based on:
- Clarity and specificity of the position summary
- Completeness and granularity of responsibilities
- Appropriateness and completeness of requirements (credentials, experience, skills, personal attributes)
- Alignment with Seven Arrows' trauma-informed, equine-assisted treatment model
- Inclusion of behavioral-health compliance expectations where relevant (ADHS, Joint Commission, CPR/CPI, confidentiality, etc.)

Respond with ONLY a single JSON object — no prose, no markdown fences — matching this exact shape:
{
  "score": <integer 0-10>,
  "headline": "<one-sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "recommendations": ["<concrete change to make 1>", "<concrete change 2>", ...]
}

Rules:
- Score must be an integer from 0 to 10.
- Provide 2-5 strengths and 3-7 recommendations.
- Each recommendation must be a concrete, actionable change — not vague advice.
- If the role is already excellent, still provide at least 3 recommendations to push it to a perfect 10.`;

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
    let parsed: Partial<RatingResult>;
    try {
      parsed = JSON.parse(cleaned) as Partial<RatingResult>;
    } catch {
      return NextResponse.json(
        { error: 'Could not parse Claude output as JSON.', raw: text },
        { status: 502 }
      );
    }

    const score = Math.max(0, Math.min(10, Math.round(Number(parsed.score) || 0)));
    const result: RatingResult = {
      score,
      headline: typeof parsed.headline === 'string' ? parsed.headline.trim() : '',
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.filter((r): r is string => typeof r === 'string' && r.trim() !== '').map((r) => r.trim())
        : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.filter((r): r is string => typeof r === 'string' && r.trim() !== '').map((r) => r.trim())
        : [],
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
