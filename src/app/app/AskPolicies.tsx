'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useState } from 'react';

// "Ask about policies" widget. POSTs to /api/claude/policies/ask with the
// user's bearer token and renders Claude's grounded answer.

interface QA {
  question: string;
  answer: string;
  error?: string;
  loading?: boolean;
}

const SAMPLE_QUESTIONS = [
  'What do we do when a client relapses?',
  'Who approves changes to treatment plans?',
  'What is the protocol for a medical emergency?',
  'How often are policies reviewed?',
];

export default function AskPolicies() {
  const { session } = useAuth();
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<QA[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || !session?.access_token || submitting) return;
    setSubmitting(true);
    setHistory((prev) => [{ question: q, answer: '', loading: true }, ...prev]);
    setQuestion('');

    try {
      const res = await fetch('/api/claude/policies/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setHistory((prev) => prev.map((h, i) => (i === 0 ? { ...h, loading: false, error: data?.error || `Error ${res.status}` } : h)));
      } else {
        setHistory((prev) => prev.map((h, i) => (i === 0 ? { ...h, loading: false, answer: (data?.answer as string) || '' } : h)));
      }
    } catch (err) {
      setHistory((prev) => prev.map((h, i) => (i === 0 ? { ...h, loading: false, error: err instanceof Error ? err.message : String(err) } : h)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-3 px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
          Ask about policies
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ask(question); } }}
            placeholder="Ask anything about the policies & procedures…"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none"
          />
          <button
            onClick={() => ask(question)}
            disabled={!question.trim() || submitting}
            className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Ask
          </button>
        </div>

        {history.length === 0 ? (
          <div className="p-4">
            <p className="text-[11px] text-foreground/40 mb-2" style={{ fontFamily: 'var(--font-body)' }}>Try one of these:</p>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_QUESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="px-2.5 py-1 text-[11px] text-foreground/70 bg-warm-bg hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {history.map((h, i) => (
              <div key={i} className="px-4 py-3">
                <p className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>You asked</p>
                <p className="text-sm text-foreground mb-2.5">{h.question}</p>
                <p className="text-[11px] font-semibold text-primary/70 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Answer</p>
                {h.loading ? (
                  <div className="flex items-center gap-2 text-xs text-foreground/50">
                    <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Reading every policy…
                  </div>
                ) : h.error ? (
                  <p className="text-xs text-red-600">{h.error}</p>
                ) : (
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{h.answer}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
