import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/claude/calls/daily-summary
// Body: { calls: CallSummary[], scores: Record<string, ScoreRow>, date: string }
// Returns: { summary: string }
//
// Generates a short narrative summary of a single day's calls so the operator
// can see at a glance what happened today (volume, who called, what they
// wanted, what was missed, what to follow up on).

const DEFAULT_MODEL = 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

interface CallSummary {
  id: string | number;
  called_at?: string | null;
  direction?: string | null;
  duration?: number | null;
  talk_time?: number | null;
  voicemail?: boolean | null;
  caller_number_formatted?: string | null;
  caller_number?: string | null;
  source?: string | null;
  source_name?: string | null;
  city?: string | null;
  state?: string | null;
}

interface ScoreInput {
  caller_name?: string | null;
  client_type?: string | null;
  fit_score?: number | null;
  summary?: string | null;
  next_steps?: string | null;
  caller_interest?: string | null;
}

function fmtDur(s: number | null | undefined): string {
  if (s == null) return 'unknown';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    const d2 = new Date(String(iso).replace(' ', 'T'));
    if (!isNaN(d2.getTime())) return d2.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });
    return 'unknown';
  }
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });
}

function buildPrompt(date: string, calls: CallSummary[], scores: Record<string, ScoreInput>): string {
  if (calls.length === 0) {
    return `No calls on ${date}. Reply with exactly: "No calls today yet."`;
  }
  const lines = calls.map((c, i) => {
    const id = String(c.id);
    const s = scores[id] || {};
    const direction = c.direction || 'unknown';
    const number = c.caller_number_formatted || c.caller_number || 'unknown';
    const name = s.caller_name ? ` — ${s.caller_name}` : '';
    const loc = [c.city, c.state].filter(Boolean).join(', ');
    const src = c.source_name || c.source || 'direct';
    const status = c.voicemail ? 'voicemail' : (c.talk_time ?? 0) >= 3 ? `talked ${fmtDur(c.talk_time)}` : 'no answer';
    const fit = s.fit_score != null ? ` · fit ${s.fit_score}/100` : '';
    const type = s.client_type ? ` · ${s.client_type}` : '';
    const intent = s.caller_interest ? ` · wants: ${s.caller_interest}` : '';
    const sum = s.summary ? ` — ${s.summary.replace(/\s+/g, ' ').slice(0, 240)}` : '';
    const next = s.next_steps ? ` · next: ${s.next_steps.replace(/\s+/g, ' ').slice(0, 160)}` : '';
    return `${i + 1}. ${fmtTime(c.called_at)} · ${direction} · ${number}${name} · ${loc || '—'} · ${src} · ${status}${fit}${type}${intent}${sum}${next}`;
  });

  return `You are the daily call-floor briefing assistant for Seven Arrows Recovery, an addiction treatment facility. Summarize today's calls (${date}) for the admissions / front-desk team.

Today's calls (${calls.length} total):
${lines.join('\n')}

Write a concise operational briefing (3-6 short sentences, no headers, no bullets unless absolutely necessary) covering:
- Overall volume and shape of the day (busy / quiet, mostly inbound or outbound).
- The meaningful prospects — name them, mention what they want, flag anyone who looks like a strong fit.
- Anything missed that needs a callback (especially paid sources or high-intent voicemails).
- One clear "do this next" suggestion if appropriate.

Be specific. Use real caller names, numbers, and times. Don't editorialize. Don't repeat the metadata verbatim — interpret it. Keep total length under 140 words.`;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as {
    calls?: CallSummary[];
    scores?: Record<string, ScoreInput>;
    date?: string;
  };

  const calls = Array.isArray(body.calls) ? body.calls : [];
  const scores = body.scores || {};
  const date = (body.date || new Date().toISOString().slice(0, 10)).slice(0, 10);

  if (calls.length === 0) {
    return NextResponse.json({ summary: 'No calls today yet.' });
  }

  const prompt = buildPrompt(date, calls, scores);
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
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Anthropic API error (${res.status}): ${text}` }, { status: res.status });
    }

    const data = await res.json();
    const content = data?.content;
    let summary = '';
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === 'text' && typeof block.text === 'string') summary += block.text;
      }
    }
    return NextResponse.json({ summary: summary.trim() });
  } catch (err) {
    return NextResponse.json({ error: `Request failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
