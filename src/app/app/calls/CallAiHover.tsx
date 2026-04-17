'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Call {
  id: number;
  name: string;
  caller_number: string;
  caller_number_formatted: string;
  tracking_number: string;
  tracking_number_formatted: string;
  receiving_number_formatted: string;
  duration: number;
  talk_time: number;
  ring_time: number;
  direction: string;
  source: string;
  source_name: string;
  city: string;
  state: string;
  called_at: string;
  tracking_label: string;
  audio: string;
  tag_list: string[];
  status: string;
  voicemail: boolean;
  first_call: boolean;
  notes: string;
}

interface ScoreRow {
  call_id: string;
  score: number;
  caller_name: string | null;
  caller_interest: string | null;
  summary: string;
  operator_strengths: string[];
  operator_weaknesses: string[];
  next_steps: string | null;
  sentiment: string | null;
  scored_at: string;
}

function scoreColor(s: number): string {
  if (s >= 80) return 'bg-emerald-500 text-white border-emerald-600';
  if (s >= 60) return 'bg-blue-500 text-white border-blue-600';
  if (s >= 40) return 'bg-amber-500 text-white border-amber-600';
  return 'bg-red-500 text-white border-red-600';
}

function scoreBg(s: number): string {
  if (s >= 80) return 'bg-emerald-500';
  if (s >= 60) return 'bg-blue-500';
  if (s >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function sentimentColor(s: string | null): string {
  if (s === 'positive') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (s === 'negative') return 'text-red-700 bg-red-50 border-red-200';
  if (s === 'neutral') return 'text-slate-700 bg-slate-50 border-slate-200';
  return 'text-foreground/50 bg-gray-50 border-gray-200';
}

interface Props {
  call: Call;
  preScore?: ScoreRow | null;
  onScoreUpdate?: (callId: string, score: ScoreRow) => void;
}

export default function CallAiHover({ call, preScore, onScoreUpdate }: Props) {
  const { session, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreRow | null>(preScore || null);
  const [error, setError] = useState<string | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (preScore && !result) setResult(preScore);
    else if (preScore && result && preScore.scored_at !== result.scored_at) setResult(preScore);
  }, [preScore]);

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupW = 384;
    let left = rect.right - popupW;
    if (left < 8) left = 8;
    if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
    let top = rect.bottom + 8;
    const maxH = 460;
    if (top + maxH > window.innerHeight - 8) {
      top = rect.top - maxH - 8;
      if (top < 8) top = 8;
    }
    setPos({ top, left });
  }, []);

  async function loadScore(force = false) {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/claude/calls/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ callId: String(call.id), call, force }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || `Error ${res.status}`);
      } else {
        const row = data?.result as ScoreRow;
        setResult(row);
        onScoreUpdate?.(String(call.id), row);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleEnter() {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      updatePos();
      setOpen(true);
    }, 250);
  }

  function handleLeave() {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => () => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, updatePos]);

  if (!isAdmin) return null;

  const popup = open && typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed z-[9999] w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-left"
      style={{ top: pos.top, left: pos.left }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="px-4 py-3 bg-gradient-to-br from-primary/5 to-warm-bg border-b border-gray-100 flex items-center gap-3">
        {result ? (
          <span className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border ${scoreColor(result.score)}`}>
            {result.score}
          </span>
        ) : (
          <span className="w-11 h-11 rounded-full bg-warm-bg flex items-center justify-center">
            {loading ? (
              <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
            )}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>AI call review</p>
          <p className="text-sm font-semibold text-foreground truncate">
            {result?.caller_name || call.name || call.caller_number_formatted || 'Unknown caller'}
          </p>
          {result?.sentiment && (
            <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${sentimentColor(result.sentiment)}`}>
              {result.sentiment}
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); loadScore(true); }}
          disabled={loading}
          className="p-1.5 rounded-lg text-foreground/40 hover:text-primary hover:bg-white transition-colors disabled:opacity-50"
          title="Re-score this call"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
        </button>
      </div>

      <div className="p-4 space-y-3 max-h-[26rem] overflow-y-auto text-sm">
        {loading && !result && (
          <p className="text-xs text-foreground/50">{call.audio ? 'Listening to the recording…' : 'Reading the call metadata…'}</p>
        )}
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        {result && (
          <>
            {result.caller_interest && (
              <div>
                <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Interested in</p>
                <p className="text-sm text-foreground/80 leading-snug">{result.caller_interest}</p>
              </div>
            )}
            {result.summary && (
              <div>
                <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Summary</p>
                <p className="text-xs text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{result.summary}</p>
              </div>
            )}
            {result.operator_strengths?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Operator strengths</p>
                <ul className="text-xs text-foreground/80 space-y-1 list-disc pl-4" style={{ fontFamily: 'var(--font-body)' }}>
                  {result.operator_strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {result.operator_weaknesses?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Areas to coach</p>
                <ul className="text-xs text-foreground/80 space-y-1 list-disc pl-4" style={{ fontFamily: 'var(--font-body)' }}>
                  {result.operator_weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {result.next_steps && (
              <div className="pt-2 mt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Recommended next step</p>
                <p className="text-xs text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{result.next_steps}</p>
              </div>
            )}
            <p className="text-[10px] text-foreground/30 pt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Scored {new Date(result.scored_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); updatePos(); setOpen((o) => !o); }}
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
      {popup}
    </div>
  );
}
