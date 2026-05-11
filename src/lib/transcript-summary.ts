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
