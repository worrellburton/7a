'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';

// PAA Questions — content backlog of People-Also-Ask boxes that
// surfaced when SerpAPI ran our priority-1 seed keywords. Each
// question is an opportunity: write a clear answer on the right
// page, earn the box. Status cycles open → drafting → live → ignore.

type Status = 'open' | 'drafting' | 'live' | 'ignore';

interface Question {
  id: string;
  question: string;
  seed_keyword_id: string | null;
  seed_keyword_text: string | null;
  snippet: string | null;
  source_title: string | null;
  source_link: string | null;
  we_own: boolean;
  status: Status;
  notes: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

const STATUS_LABELS: Record<Status, string> = {
  open: 'Open',
  drafting: 'Drafting',
  live: 'Live',
  ignore: 'Ignore',
};

const STATUS_TONE: Record<Status, string> = {
  open: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
  drafting: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  live: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  ignore: 'bg-foreground/5 text-foreground/55 border-black/10 hover:bg-foreground/10',
};

const STATUS_CYCLE: Record<Status, Status> = {
  open: 'drafting',
  drafting: 'live',
  live: 'open',
  ignore: 'open',
};

export default function QuestionsContent() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<'open' | 'all' | 'we_own' | Status>('open');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/questions', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setQuestions((json.questions ?? []) as Question[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function mine() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/questions', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  async function patchQuestion(id: string, body: Partial<Pick<Question, 'status' | 'notes'>>) {
    const before = questions;
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...body } : q)));
    try {
      const res = await fetch(`/api/seo/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setQuestions((prev) => prev.map((q) => (q.id === id ? (json.question as Question) : q)));
    } catch (e) {
      setQuestions(before);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Remove this question?')) return;
    const before = questions;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    try {
      const res = await fetch(`/api/seo/questions/${id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
    } catch (e) {
      setQuestions(before);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const counts = useMemo(() => {
    const c = { all: questions.length, open: 0, drafting: 0, live: 0, ignore: 0, we_own: 0 };
    for (const q of questions) {
      c[q.status] += 1;
      if (q.we_own) c.we_own += 1;
    }
    return c;
  }, [questions]);

  const visible = useMemo(() => {
    const qq = query.trim().toLowerCase();
    return questions.filter((q) => {
      if (filter === 'open' && q.status !== 'open') return false;
      if (filter === 'we_own' && !q.we_own) return false;
      if (filter !== 'open' && filter !== 'all' && filter !== 'we_own' && q.status !== filter) return false;
      if (!qq) return true;
      return (
        q.question.toLowerCase().includes(qq) ||
        (q.snippet ?? '').toLowerCase().includes(qq) ||
        (q.seed_keyword_text ?? '').toLowerCase().includes(qq)
      );
    });
  }, [questions, filter, query]);

  return (
    <div className="p-8 max-w-7xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/app/seo"
              className="text-xs font-semibold text-foreground/40 hover:text-primary uppercase tracking-wider inline-flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              SEO
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            PAA Questions
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            Content backlog mined from Google&apos;s People-Also-Ask
            boxes on our priority-1 keywords. Each row is a question
            we could answer on a real page to earn the PAA slot.
          </p>
        </div>
        <button
          type="button"
          onClick={mine}
          disabled={running}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition ${
            running ? 'bg-foreground/40 text-white cursor-wait' : 'bg-primary text-white hover:bg-primary-dark'
          }`}
        >
          <svg className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
          {running ? 'Mining…' : 'Mine PAA'}
        </button>
      </header>

      <SeoSubNav />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-5">
          <strong>Couldn&apos;t complete that:</strong> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <Stat label="Total" value={counts.all} />
        <Stat label="Open" value={counts.open} accent="rose" />
        <Stat label="Drafting" value={counts.drafting} accent="amber" />
        <Stat label="Live" value={counts.live} accent="emerald" />
        <Stat label="We own" value={counts.we_own} accent="emerald" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Chip active={filter === 'open'} onClick={() => setFilter('open')} label="Open" count={counts.open} />
        <Chip active={filter === 'drafting'} onClick={() => setFilter('drafting')} label="Drafting" count={counts.drafting} />
        <Chip active={filter === 'live'} onClick={() => setFilter('live')} label="Live" count={counts.live} />
        <Chip active={filter === 'ignore'} onClick={() => setFilter('ignore')} label="Ignore" count={counts.ignore} />
        <Chip active={filter === 'we_own'} onClick={() => setFilter('we_own')} label="We own" count={counts.we_own} />
        <Chip active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={counts.all} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          className="ml-auto text-sm rounded-md border border-black/10 bg-white px-3 py-1.5 w-64 max-w-full"
        />
      </div>

      {loading ? (
        <p className="text-sm text-foreground/55 py-8 text-center">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-warm-bg/40 p-10 text-center">
          <p className="text-sm text-foreground/60">
            {questions.length === 0
              ? 'No questions yet. Click "Mine PAA" to fetch from SerpAPI.'
              : 'No questions match the current filter.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((q) => (
            <li key={q.id} className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-semibold text-foreground">{q.question}</h3>
                    {q.we_own ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        We own it
                      </span>
                    ) : null}
                    {q.seed_keyword_text ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-warm-bg/70 text-foreground/55 border border-black/5">
                        seed: {q.seed_keyword_text}
                      </span>
                    ) : null}
                  </div>
                  {q.snippet ? (
                    <p className="text-sm text-foreground/70 mt-1.5 whitespace-pre-wrap">{q.snippet}</p>
                  ) : null}
                  {q.source_link ? (
                    <a
                      href={q.source_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline inline-block mt-1 truncate max-w-full"
                      title={q.source_link}
                    >
                      {q.source_title || q.source_link}
                    </a>
                  ) : null}
                  <p className="text-[11px] text-foreground/45 mt-2">
                    First seen {new Date(q.first_seen_at).toLocaleDateString()}
                    {' · '}
                    last seen {new Date(q.last_seen_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => patchQuestion(q.id, { status: STATUS_CYCLE[q.status] })}
                    className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors ${STATUS_TONE[q.status]}`}
                    title="Cycle status"
                  >
                    {STATUS_LABELS[q.status]}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteQuestion(q.id)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/45 hover:text-red-600 hover:bg-red-50"
                    aria-label="Remove question"
                    title="Remove"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                    </svg>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: 'rose' | 'amber' | 'emerald' }) {
  const tone = accent === 'rose' ? 'text-rose-600' : accent === 'amber' ? 'text-amber-600' : accent === 'emerald' ? 'text-emerald-600' : 'text-foreground';
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-0.5 ${tone}`}>{value}</p>
    </div>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
        active ? 'bg-foreground text-white border-foreground' : 'bg-white text-foreground/65 border-black/10 hover:bg-warm-bg/40'
      }`}
    >
      {label}
      <span className={`ml-1 ${active ? 'text-white/70' : 'text-foreground/40'}`}>· {count}</span>
    </button>
  );
}
