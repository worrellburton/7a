import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';
import {
  buildSuggestSystemPrompt,
  buildSuggestUserMessage,
  callClaudeForCandidates,
  callGeminiForCandidates,
  cleanSuggestedContacts,
  loadRoster,
  type SuggestedContact,
  type SuggestProvider,
} from '@/lib/contact-suggest';

// POST /api/contacts/suggest — model-agnostic outreach research.
//
// Accepts a provider field choosing between Claude (Anthropic with
// hosted web_search) and Gemini (Google with native google_search
// grounding). The system prompt + roster fetch + post-processing
// are shared between the two so swapping providers doesn't change
// the contract the modal consumes.
//
// Response shape (unchanged): { contacts, complete, partial,
// missingCount, totalReturned, provider } so the modal can split
// candidates with verified phone+email from partials.
//
// API keys (server-side only):
//   * Anthropic — ANTHROPIC_API_KEY
//   * Gemini    — GEMINI_API_KEY

export const dynamic = 'force-dynamic';
// Both providers run a multi-step search loop server-side; raise
// the default 10s edge timeout so a 5-candidate web-grounded run
// has room to finish.
export const maxDuration = 120;

interface SuggestBody {
  prompt?: string;
  count?: number;
  provider?: SuggestProvider; // 'claude' | 'gemini' — defaults to claude
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: SuggestBody = {};
  try { body = (await req.json()) as SuggestBody; } catch { /* allow empty */ }
  const userPrompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 800) : '';
  const requested = Math.min(Math.max(body.count ?? 5, 1), 50);
  const provider: SuggestProvider = body.provider === 'gemini' ? 'gemini' : 'claude';

  const admin = getAdminSupabase();
  const roster = await loadRoster(admin);
  const systemPrompt = buildSuggestSystemPrompt();
  const userMessage = buildSuggestUserMessage({ roster, userPrompt, requested });

  try {
    const rawJson = provider === 'gemini'
      ? await callGeminiForCandidates({ systemPrompt, userMessage, requested })
      : await callClaudeForCandidates({ systemPrompt, userMessage, requested });

    if (!rawJson.ok) {
      return NextResponse.json({ error: rawJson.error, raw: rawJson.raw }, { status: rawJson.status });
    }

    const cleaned: SuggestedContact[] = cleanSuggestedContacts(rawJson.contacts);
    const complete = cleaned.filter((c) => c.missing.length === 0);
    const partial = cleaned.filter((c) => c.missing.length > 0);

    return NextResponse.json({
      contacts: cleaned,
      complete,
      partial,
      missingCount: partial.length,
      totalReturned: cleaned.length,
      provider,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err), provider }, { status: 500 });
  }
}
