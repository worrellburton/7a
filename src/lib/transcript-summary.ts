// Summarise a pasted call / meeting transcript via the Claude API.
//
// Used by /api/contacts/:id/log-contact when an admin pastes a
// transcript into the Log-a-Contact modal, and by the Aircall AI
// backfill to summarise call transcripts. The summary lives on the
// contact_log / aircall_calls row so the UI can show it without having
// to download the raw transcript text.
//
// Returns null on any failure (missing API key, network error,
// truncated response). The caller treats "no summary" as a soft
// degrade — the log entry still saves with the raw transcript, the
// summary just shows as a fallback message.
//
// Model resilience: the summariser is the only consumer of
// ANTHROPIC_SUMMARY_MODEL. A stale/invalid value there (e.g. a Sonnet
// version Anthropic retired) would 404 every request and silently blank
// out call summaries AND "how did you hear about us" source detection,
// while every other Claude feature (which uses ANTHROPIC_CONTENT_MODEL /
// ANTHROPIC_MODEL) keeps working — exactly the failure we hit on
// 2026-06-22. So we try the configured model first and fall back through
// known-good models on any non-200, and we log the real Claude error so
// the cause is visible in the runtime logs instead of vanishing.

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_VERSION = '2023-06-01';

// Canonical, current models (see CLAUDE.md / the anthropic model-check
// cron). Sonnet for quality summaries, Haiku as a cheap always-available
// last resort so a degraded summary beats no summary.
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const FALLBACK_MODEL = 'claude-haiku-4-5-20251001';

// Configured model first, then the canonical defaults. De-duped so we
// never call the same model twice when no override is set.
const MODEL_CANDIDATES: string[] = [
  ...new Set([
    process.env.ANTHROPIC_SUMMARY_MODEL || DEFAULT_MODEL,
    DEFAULT_MODEL,
    FALLBACK_MODEL,
  ]),
];

const SYSTEM_PROMPT = [
  'You summarise call / meeting transcripts for an admissions team at a residential treatment centre.',
  'They use these summaries to remember what was discussed when they look at a contact again weeks later.',
  '',
  'Output rules:',
  '- 3 to 6 short bullet points. Each line starts with "- ".',
  '- First bullet: who was on the call (names + roles if mentioned).',
  '- Then: the substantive topics, decisions, and ANY next steps / follow-ups / commitments.',
  '- Be specific. Names, numbers, dates, dollar amounts, insurance carriers, level-of-care decisions — keep them.',
  '- Skip pleasantries, scheduling logistics, and small talk.',
  '- Plain text only. No headings, no markdown other than the "- " bullets, no preamble.',
  '- If the transcript is empty or unintelligible, output a single bullet: "- (Transcript was empty or unreadable.)"',
].join('\n');

// System prompt for source detection. The model only reports a source
// when the operator actually asked how the caller heard about the centre
// AND the caller gave an answer — otherwise it returns the NONE sentinel.
const SOURCE_SYSTEM_PROMPT = [
  'You read a phone-call transcript between an admissions operator at a treatment centre and a caller.',
  'Your only job: detect whether the operator asked HOW / WHERE the caller heard about the centre',
  '(e.g. "how did you hear about us", "where did you hear about us", "how\'d you find us",',
  '"who referred you", "what brought you to us"), and if so, capture the caller\'s answer.',
  '',
  'Output rules:',
  '- If the operator asked AND the caller gave a source, output ONLY that source as a short label',
  '  of 1-4 words, title-cased. Examples: "Google", "Psychology Today", "Insurance directory",',
  '  "Referral from Dr. Lee", "Friend", "Facebook", "Alumni".',
  '- If the operator never asked, or the caller did not give a clear answer, output exactly: NONE',
  '- Output the label or NONE only. No quotes, no punctuation, no explanation, no preamble.',
].join('\n');

interface ClaudeCall { status: number; text: string | null }

// Single Claude messages request for one model. Returns the HTTP status
// so the caller can decide whether to fall back (non-200) or accept the
// result (200, even when the model produced empty text).
async function claudeOnce(
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<ClaudeCall> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { status: 0, text: null };

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': CLAUDE_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[transcript-summary] Claude ${res.status} for model "${model}": ${body.slice(0, 300)}`);
      return { status: res.status, text: null };
    }
    const json = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    const text = (json.content ?? [])
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text as string)
      .join('\n')
      .trim();
    return { status: 200, text: text || null };
  } catch (e) {
    console.error('[transcript-summary] Claude request threw:', e instanceof Error ? e.message : e);
    return { status: 0, text: null };
  }
}

// Try each candidate model until one returns a 200. A 200 with empty
// text is a real "nothing to say" answer and stops the cascade; only a
// transport/HTTP failure (status !== 200) advances to the next model.
async function runClaude(system: string, user: string, maxTokens: number): Promise<string | null> {
  for (const model of MODEL_CANDIDATES) {
    const r = await claudeOnce(model, system, user, maxTokens);
    if (r.status === 200) return r.text;
    if (model !== MODEL_CANDIDATES[MODEL_CANDIDATES.length - 1]) {
      console.error(`[transcript-summary] falling back from "${model}" after status ${r.status}`);
    }
  }
  return null;
}

// Returns the caller's "how did you hear about us" source, or null when
// it was never asked / answered. Used to populate aircall_calls.source.
export async function extractCallSource(transcript: string): Promise<string | null> {
  const trimmed = transcript.trim().slice(0, 200_000);
  if (!trimmed) return null;

  const text = await runClaude(SOURCE_SYSTEM_PROMPT, `Transcript:\n\n---\n${trimmed}\n---`, 30);
  if (!text) return null;

  const out = text.replace(/^["']|["']$/g, '').trim();
  if (!out || /^none$/i.test(out)) return null;
  // Guard against a runaway answer — keep it short.
  return out.length > 60 ? out.slice(0, 60).trim() : out;
}

export async function summariseTranscript(transcript: string): Promise<string | null> {
  const trimmed = transcript.trim().slice(0, 200_000);
  if (!trimmed) return null;

  return runClaude(
    SYSTEM_PROMPT,
    `Summarise the following call / meeting transcript per the rules in the system message.\n\n---\n${trimmed}\n---`,
    800,
  );
}
