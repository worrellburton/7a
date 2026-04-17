import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/claude/policies/ask
// Body: { question: string }
// Loads all policies from the DB, hands them to Claude as context, and returns
// a grounded answer with citations (policy number / name).
//
// Required env: ANTHROPIC_API_KEY
// Optional env: ANTHROPIC_MODEL (defaults to claude-opus-4-6)

const DEFAULT_MODEL = 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

interface PolicyRow {
  id: string;
  section: string;
  name: string;
  policy_number: string | null;
  content: string;
  purpose: string | null;
  scope: string | null;
  version: number | null;
}

function clipForPrompt(text: string, maxChars: number): string {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '…[truncated]';
}

function buildPrompt(question: string, policies: PolicyRow[]): string {
  const sections: string[] = [];
  for (const p of policies) {
    const header = `# ${p.name}${p.policy_number ? ` (${p.policy_number})` : ''}\nSection: ${p.section}${p.version ? ` · v${p.version}` : ''}`;
    const purpose = p.purpose ? `\n## Purpose\n${clipForPrompt(p.purpose, 2000)}` : '';
    const scope = p.scope ? `\n## Scope\n${clipForPrompt(p.scope, 2000)}` : '';
    const body = `\n## Policy\n${clipForPrompt(p.content || '', 8000)}`;
    sections.push(header + purpose + scope + body);
  }
  const context = sections.join('\n\n---\n\n');

  return `You are the Seven Arrows Recovery policies-and-procedures assistant. Use only the policy content provided below to answer the staff member's question.

Rules:
- Ground every claim in the policies. Cite the policy name (and policy number when available) inline, e.g. "(7A.1.02 Accreditation Participation Requirements)".
- If the answer is not covered by the policies, say so and suggest which related policy/section might apply.
- Be concise. Bulleted lists are fine. Never invent procedures.
- Quote key language verbatim when the wording matters.

=== POLICIES ===
${context}
=== END POLICIES ===

Question: ${question}

Answer:`;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as { question?: string };
  const question = (body.question || '').trim();
  if (!question) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  const { data: policies, error } = await supabase
    .from('policies')
    .select('id, section, name, policy_number, content, purpose, scope, version')
    .order('section', { ascending: true });

  if (error) {
    return NextResponse.json({ error: `Failed to load policies: ${error.message}` }, { status: 500 });
  }

  const rows = (policies || []) as PolicyRow[];
  if (rows.length === 0) {
    return NextResponse.json({ answer: 'There are no policies in the system yet, so I have nothing to reference.' });
  }

  const prompt = buildPrompt(question, rows);
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
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Anthropic API error (${res.status}): ${text}` }, { status: res.status });
    }

    const data = await res.json();
    const content = data?.content;
    let answer = '';
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === 'text' && typeof block.text === 'string') answer += block.text;
      }
    }
    return NextResponse.json({ answer: answer.trim() });
  } catch (err) {
    return NextResponse.json({ error: `Request failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
