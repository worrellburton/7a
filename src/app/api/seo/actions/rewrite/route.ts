import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// POST /api/seo/actions/rewrite — rewrites a free-form SEO Action
// title for SEO clarity. The user pastes a quick line ("Updated meta
// descriptions for being too long"); Claude returns a tighter version
// that names the actual SEO outcome ("Tightened meta descriptions
// site-wide so they stop truncating in SERP snippets"). The submit
// flow shows both side-by-side and the user picks which one is posted.
//
// Body: { title: string }
// Returns: { rewrite: string }
//
// Auth: cookies, matching the sibling /api/seo/actions route that
// the same submit flow already POSTs to. Earlier this route used
// getUserFromRequest which checks for a Bearer token, so the same-
// origin browser fetch (which only sends the session cookie) hit a
// 401 and the modal showed "Couldn't rewrite: Unauthorized".

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

type Body = { title?: string };

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 500 },
    );
  }

  const body = (await req.json()) as Body;
  const title = (body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const prompt = `You are rewriting a free-form SEO action item submitted to the internal SEO Actions todo list at Seven Arrows Recovery — a boutique residential drug & alcohol rehab in Arizona.

The submitter writes a quick line describing the work. Your job is to rewrite it so the SEO intent is unambiguous to whoever picks it up: name the page or property, the SEO lever pulled (title tag, meta description, schema, redirect, internal link, backlink, etc.), and the user-visible outcome. Keep it short — one or two sentences max. Use plain prose, no markdown, no emojis, no quotes around the rewrite.

Original:
${title}

Respond with ONLY the rewritten action — no preface, no labels, no explanation.`;

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
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
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
    const rewrite = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
      .trim()
      .replace(/^["']|["']$/g, '');

    return NextResponse.json({ rewrite });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
