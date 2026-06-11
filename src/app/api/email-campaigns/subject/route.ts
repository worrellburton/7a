import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// POST /api/email-campaigns/subject
//
// Phase 7 — auto-calculate a subject line from the campaign's
// prompt + generated HTML body. Triggered on the recipients
// page when the marketer first lands there without a subject.
// Persists the result back onto the campaign row so revisits
// don't re-spend tokens.

const DEFAULT_MODEL = 'claude-fable-5';

// Fable 5 thinks before answering, even for a one-liner — give the
// function room beyond the platform default.
export const maxDuration = 120;
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as { campaignId?: unknown };
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : null;
  if (!campaignId) return NextResponse.json({ error: 'Missing campaignId.' }, { status: 400 });

  const supabase = getAdminSupabase();
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('prompt, generated_html, generated_subject')
    .eq('id', campaignId)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });

  // If we already have one, just return it — the UI guards
  // against double-calls but a stale tab might still send one.
  if (campaign.generated_subject && campaign.generated_subject.trim().length > 0) {
    return NextResponse.json({ subject: campaign.generated_subject });
  }

  const bodyText = (campaign.generated_html ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2500);

  const prompt = `You are writing the subject line for a Seven Arrows Recovery marketing email. Voice is warm, honest, hope-forward. No clickbait, no clinical jargon, no emoji. ≤ 70 chars. No quote marks, no markdown — just the subject text.

AUTHOR PROMPT:
${(campaign.prompt ?? '').slice(0, 1500)}

EMAIL BODY (plain-text extract):
${bodyText}

Return ONLY the subject line.`;

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
        // 512, was 256 — headroom for Fable 5's tokenizer.
        max_tokens: 512,
        // One subject line doesn't need deep deliberation.
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Anthropic API error (${res.status}): ${text}` }, { status: res.status });
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }>; stop_reason?: string };
    if (data.stop_reason === 'refusal') {
      return NextResponse.json(
        { error: 'The model declined this request. Try regenerating the subject.' },
        { status: 502 },
      );
    }
    const subject = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
      .trim()
      .replace(/^["'`]+|["'`]+$/g, '')
      .slice(0, 120);
    if (!subject) return NextResponse.json({ error: 'Claude returned an empty subject.' }, { status: 502 });

    await supabase.from('email_campaigns').update({ generated_subject: subject }).eq('id', campaignId);
    return NextResponse.json({ subject });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
