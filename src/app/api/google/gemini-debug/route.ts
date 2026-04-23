import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// GET /api/google/gemini-debug
// Admin-only. Sends a tiny one-shot prompt to the same Gemini
// endpoint the call-scoring pipeline uses (generativelanguage
// googleapis.com v1beta). Surfaces whether GEMINI_API_KEY is set,
// which model is configured, the raw HTTP status, and any error
// body from Google — mirror of /api/google/places-debug.
// The key itself is never echoed; only its presence and length.

export const dynamic = 'force-dynamic';

const DEFAULT_MODEL = 'gemini-2.5-pro';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const env = {
    GEMINI_API_KEY_set: Boolean(apiKey),
    GEMINI_API_KEY_length: apiKey?.length ?? 0,
    GEMINI_MODEL: model,
  };

  if (!apiKey) {
    return NextResponse.json({ env, error: 'GEMINI_API_KEY not set in this environment' }, { status: 412 });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  // Gemini 2.5 models enable "thinking" by default and burn output
  // tokens on internal reasoning before emitting user-visible text.
  // Budget has to cover both thinking + the final word, so 64 is the
  // smallest number that reliably gets a reply. (The production call
  // scoring route uses 8000.)
  const body = {
    contents: [{ role: 'user', parts: [{ text: 'Respond with exactly the word: OK' }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 64 },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text.slice(0, 500);
    }
    const asObj = parsed as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number; thoughtsTokenCount?: number };
      error?: { message?: string; status?: string; code?: number };
    };
    const replyText = asObj?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    return NextResponse.json({
      env,
      http: res.status,
      ok: res.ok,
      reply: replyText,
      finishReason: asObj?.candidates?.[0]?.finishReason ?? null,
      usage: asObj?.usageMetadata ?? null,
      error: asObj?.error ?? null,
      raw: typeof parsed === 'string' ? parsed : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ env, error: `fetch threw: ${message}` }, { status: 502 });
  }
}
