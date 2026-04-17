'use client';

import { useCallback } from 'react';

interface Call {
  id: number;
  audio: string;
}

interface ScoreRow {
  call_id: string;
  score: number;
  caller_name: string | null;
  operator_name: string | null;
  caller_interest: string | null;
  summary: string;
  operator_strengths: string[];
  operator_weaknesses: string[];
  next_steps: string | null;
  sentiment: string | null;
  scored_at: string;
}

function scoreBg(s: number): string {
  if (s >= 80) return 'bg-emerald-500';
  if (s >= 60) return 'bg-blue-500';
  if (s >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

interface Props {
  call: Call;
  preScore?: ScoreRow | null;
  loading?: boolean;
  onClick?: () => void;
  onRescore?: (callId: string, force: boolean) => void;
}

// Simple non-interactive score badge shown in each call row. The full AI
// review now lives in the expanded row (see CallAiPanel). Clicking the badge
// fires onClick (for popover) if provided, otherwise triggers re-score.
export default function CallAiBadge({ call, preScore, loading, onClick, onRescore }: Props) {
  const result = preScore || null;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick();
    else onRescore?.(String(call.id), true);
  }, [call.id, onClick, onRescore]);

  return (
    <button
      type="button"
      onClick={handleClick}
      title={result ? `AI score ${result.score} — click for coaching notes` : 'Generate AI score'}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-semibold transition-colors ${
        result
          ? `${scoreBg(result.score)} text-white border-transparent hover:opacity-90`
          : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
      }`}
      style={{ fontFamily: 'var(--font-body)' }}
      aria-label="AI score"
    >
      {loading && !result ? (
        <span className="w-3 h-3 border-2 border-current/40 border-t-transparent rounded-full animate-spin" />
      ) : result ? (
        <span className="font-bold">{result.score}</span>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      )}
    </button>
  );
}

