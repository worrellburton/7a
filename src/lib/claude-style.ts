// Single-source-of-truth for the "Claude must never use em-dashes"
// rule. Two pieces:
//
//   * EMDASH_BAN_RULE — append to every Claude system prompt so the
//     model is told the rule explicitly. Wrap it in a fenced section
//     so it doesn't get muddled with the caller's instructions.
//
//   * stripDashes(text) — post-processing safety net. Even with the
//     rule in the prompt the model still occasionally slips one in,
//     so we replace em-dashes (U+2014) and en-dashes (U+2013) with
//     a comma + space in the response before it reaches the caller.
//     Conservative substitution: a comma reads cleanly in almost
//     every spot a dash was used (parenthetical aside, list separator,
//     compound sentence). Loses some pacing nuance, but the user's
//     "never" trumps that.

export const EMDASH_BAN_RULE = [
  'Punctuation rule (strict): NEVER use em-dashes (—, U+2014) or',
  'en-dashes (–, U+2013) anywhere in your response. Substitute with',
  'a comma, semicolon, parentheses, or a period. This rule overrides',
  'any other guidance.',
].join(' ');

export function stripDashes(text: string): string {
  if (!text) return text;
  // U+2014 em-dash and U+2013 en-dash, with or without surrounding
  // whitespace. Replace with ", " so the surrounding spacing reads
  // naturally regardless of how the model wrote it.
  return text
    .replace(/\s*[—–]\s*/g, ', ')
    // " -- " ASCII variant some models emit when they're trying to
    // avoid the Unicode dash literally. Same substitution.
    .replace(/\s+--\s+/g, ', ');
}
