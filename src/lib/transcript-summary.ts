// Summarise a pasted call / meeting transcript via the Claude API.
//
// Used by /api/contacts/:id/log-contact when an admin pastes a
// transcript into the Log-a-Contact modal. The summary lives on the
// contact_log row so the inline history drawer can show it without
// having to download the raw transcript text from Storage.
//
// Returns null on any failure (missing API key, network error,
// truncated response). The caller treats "no summary" as a soft
// degrade — the log entry still saves with the raw transcript on
// Storage, the summary just shows as a fallback message.

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_VERSION = '2023-06-01';
const CLAUDE_MODEL = process.env.ANTHROPIC_SUMMARY_MODEL || 'claude-sonnet-4-6';

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

// Returns the caller's "how did you hear about us" source, or null when
// it was never asked / answered. Used to populate aircall_calls.source.
export async function extractCallSource(transcript: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const trimmed = transcript.trim().slice(0, 200_000);
  if (!trimmed) return null;

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': CLAUDE_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 30,
        system: SOURCE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Transcript:\n\n---\n${trimmed}\n---`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    const out = (json.content ?? [])
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text as string)
      .join(' ')
      .trim()
      .replace(/^["']|["']$/g, '')
      .trim();
    if (!out || /^none$/i.test(out)) return null;
    // Guard against a runaway answer — keep it short.
    return out.length > 60 ? out.slice(0, 60).trim() : out;
  } catch {
    return null;
  }
}

export async function summariseTranscript(transcript: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const trimmed = transcript.trim().slice(0, 200_000);
  if (!trimmed) return null;

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': CLAUDE_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Summarise the following call / meeting transcript per the rules in the system message.\n\n---\n${trimmed}\n---`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    const parts = (json.content ?? [])
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text as string);
    const out = parts.join('\n').trim();
    return out || null;
  } catch {
    return null;
  }
}
