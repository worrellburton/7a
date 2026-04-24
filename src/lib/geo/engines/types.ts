// Shared shape every answer-engine client returns.
//
// The orchestrator (phase 8) fans out one call per (engine, prompt)
// combination and collects EngineAnswer rows, which later-phase
// detection + scoring walk over.

export type EngineId = 'openai' | 'perplexity' | 'claude' | 'google_aio';

export interface EngineCitation {
  /** Absolute URL the engine cited. */
  url: string;
  /** Cited page title, when the engine returns one. */
  title: string | null;
  /** 0-based position in the citation list (first citation = 0). */
  position: number;
}

export interface EngineAnswer {
  engine: EngineId;
  /** Prompt.id the answer was produced from. */
  promptId: string;
  /** Verbatim prompt text (echoed for convenience in the UI). */
  prompt: string;
  /** Full answer text as returned by the engine. */
  answer: string;
  /** Citations / sources the engine returned, ordered as given. */
  citations: EngineCitation[];
  /** Wall-clock ms spent on the single fetch (for timing charts). */
  fetchMs: number;
  /** True when an answer + citations were produced. */
  ok: boolean;
  /** Hard error if the call failed. null when ok. */
  error: string | null;
  /** Non-fatal notes (timeouts, partial results, truncations). */
  warnings: string[];
  /** ISO timestamp captured at fetch end. */
  fetchedAt: string;
}
