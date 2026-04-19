'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

interface CallRow {
  ctm_id: string;
  called_at: string;
  direction: string | null;
  duration: number | null;
  talk_time: number | null;
  ring_time: number | null;
  voicemail: boolean | null;
  status: string | null;
  caller_number: string | null;
  caller_number_formatted: string | null;
  receiving_number: string | null;
  receiving_number_formatted: string | null;
  tracking_number_formatted: string | null;
  source: string | null;
  source_name: string | null;
  tracking_label: string | null;
  city: string | null;
  state: string | null;
  audio_url: string | null;
  caller_name: string | null;
}

interface ScoreRow {
  fit_score: number | null;
  score: number | null;
  call_name: string | null;
  caller_name: string | null;
  operator_name: string | null;
  client_type: string | null;
  caller_interest: string | null;
  summary: string | null;
  operator_strengths: string[] | null;
  operator_weaknesses: string[] | null;
  next_steps: string | null;
  sentiment: string | null;
  transcript: string | null;
  scored_at: string | null;
}

const directionStyle: Record<string, string> = {
  inbound: 'bg-blue-50 text-blue-700',
  outbound: 'bg-orange-50 text-orange-700',
};

function scoreColor(s: number | null | undefined): string {
  if (s == null) return 'text-foreground/40';
  if (s >= 80) return 'text-emerald-600';
  if (s >= 60) return 'text-blue-600';
  if (s >= 40) return 'text-amber-600';
  return 'text-red-500';
}

function sentimentBadge(sentiment: string | null | undefined): { label: string; className: string } | null {
  if (!sentiment) return null;
  const s = sentiment.toLowerCase();
  if (s.includes('positive')) return { label: 'Positive', className: 'bg-emerald-50 text-emerald-700' };
  if (s.includes('negative')) return { label: 'Negative', className: 'bg-red-50 text-red-700' };
  if (s.includes('neutral')) return { label: 'Neutral', className: 'bg-gray-50 text-gray-600' };
  if (s.includes('mixed')) return { label: 'Mixed', className: 'bg-amber-50 text-amber-700' };
  return { label: sentiment, className: 'bg-gray-50 text-gray-600' };
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Phoenix',
  });
}

export default function CallDetailContent() {
  const { session } = useAuth();
  const params = useParams<{ id: string }>();
  const id = params?.id || '';

  const [call, setCall] = useState<CallRow | null>(null);
  const [score, setScore] = useState<ScoreRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !session?.access_token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/calls/${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || `Couldn't load call (${res.status})`);
          return;
        }
        setCall(data.call ?? null);
        setScore(data.score ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, session?.access_token]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-10 text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
        Loading call…
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-10">
        <Link href="/app/calls" className="text-xs text-primary hover:underline" style={{ fontFamily: 'var(--font-body)' }}>
          ← Back to Calls
        </Link>
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-foreground">Call not found</p>
          <p className="text-xs text-foreground/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            {error || `No call with ID #${id} in this account.`}
          </p>
        </div>
      </div>
    );
  }

  const callerLabel = score?.caller_name || call.caller_name || call.caller_number_formatted || call.caller_number || 'Unknown caller';
  const dirKey = (call.direction || '').toLowerCase();
  const dirClass = directionStyle[dirKey] || 'bg-gray-100 text-gray-600';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 sm:px-6 lg:px-10 pt-6 pb-4">
        <Link href="/app/calls" className="text-xs text-primary hover:underline inline-flex items-center gap-1" style={{ fontFamily: 'var(--font-body)' }}>
          ← Back to Calls
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{score?.call_name || callerLabel}</h1>
            <p className="text-xs text-foreground/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              <span className="font-mono">#{call.ctm_id}</span>
              {' · '}{formatDateTime(call.called_at)}
              {call.duration != null && ` · ${formatDuration(call.duration)}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium capitalize ${dirClass}`}>
              {call.direction || 'unknown'}
            </span>
            {call.voicemail && (
              <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">VM</span>
            )}
            {score?.fit_score != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-warm-bg text-foreground/80">
                Fit {score.fit_score}/100
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-10 space-y-4">
        {score ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-4xl">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div>
                <p className="text-[11px] font-medium text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                  AI analysis
                </p>
                {score.scored_at && (
                  <p className="text-[10px] text-foreground/40 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                    Scored {formatDateTime(score.scored_at)}
                  </p>
                )}
              </div>
              {(() => {
                const s = sentimentBadge(score.sentiment);
                return s ? (
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium ${s.className}`}>
                    {s.label}
                  </span>
                ) : null;
              })()}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <ScoreTile label="Score" value={score.score} />
              <ScoreTile label="Fit" value={score.fit_score} suffix="/100" />
              <MetaTile label="Operator" value={score.operator_name} />
              <MetaTile label="Client type" value={score.client_type} />
            </div>

            {score.summary && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Summary</p>
                <p className="text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{score.summary}</p>
              </div>
            )}

            {score.caller_interest && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Caller interest</p>
                <p className="text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{score.caller_interest}</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Operator strengths</p>
                {score.operator_strengths && score.operator_strengths.length > 0 ? (
                  <ul className="space-y-1">
                    {score.operator_strengths.map((s, i) => (
                      <li key={i} className="text-xs text-emerald-900 flex gap-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs italic text-emerald-800/50" style={{ fontFamily: 'var(--font-body)' }}>None surfaced.</p>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Potential to improve</p>
                {score.operator_weaknesses && score.operator_weaknesses.length > 0 ? (
                  <ul className="space-y-1">
                    {score.operator_weaknesses.map((s, i) => (
                      <li key={i} className="text-xs text-amber-900 flex gap-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs italic text-amber-800/50" style={{ fontFamily: 'var(--font-body)' }}>None surfaced.</p>
                )}
              </div>
            </div>

            {score.next_steps && (
              <div>
                <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Next steps</p>
                <p className="text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{score.next_steps}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 max-w-4xl text-center">
            <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
              No AI analysis for this call yet.
            </p>
          </div>
        )}

        {score?.transcript && (
          <TranscriptCard transcript={score.transcript} />
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-4xl">
          <p className="text-[11px] font-medium text-foreground/40 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-body)' }}>
            Call details
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
            <Field label="Caller" value={callerLabel} />
            <Field label="Caller number" value={call.caller_number_formatted || call.caller_number} mono />
            <Field label="Receiving number" value={call.receiving_number_formatted || call.receiving_number} mono />
            <Field label="Tracking number" value={call.tracking_number_formatted} mono />
            <Field label="Source" value={call.source_name || call.source} />
            <Field label="Tracking label" value={call.tracking_label} />
            <Field label="Location" value={[call.city, call.state].filter(Boolean).join(', ') || null} />
            <Field label="Status" value={call.status} />
            <Field label="Talk time" value={call.talk_time != null ? formatDuration(call.talk_time) : null} mono />
            <Field label="Ring time" value={call.ring_time != null ? formatDuration(call.ring_time) : null} mono />
            <Field label="Operator" value={score?.operator_name} />
            <Field label="Client type" value={score?.client_type} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function TranscriptCard({ transcript }: { transcript: string }) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const lines = transcript.split(/\r?\n/).filter(line => line.trim().length > 0);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-4xl">
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="inline-flex items-center gap-2 text-[11px] font-medium text-foreground/40 uppercase tracking-wider hover:text-foreground/70"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Transcript
          <span className="text-foreground/30 normal-case tracking-normal">· {lines.length} {lines.length === 1 ? 'line' : 'lines'}</span>
        </button>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-gray-200 text-foreground/70 hover:border-primary/30 hover:text-primary transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
          </svg>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {open && (
        <div className="rounded-lg bg-warm-bg/30 border border-gray-100 p-4 max-h-[480px] overflow-y-auto">
          <div className="space-y-2 text-sm leading-relaxed text-foreground/80" style={{ fontFamily: 'var(--font-body)' }}>
            {lines.map((line, i) => {
              const m = line.match(/^([A-Za-z][\w\s.'-]{0,60}?):\s*(.*)$/);
              if (m) {
                return (
                  <p key={i}>
                    <span className="font-semibold text-foreground">{m[1]}:</span>{' '}
                    <span>{m[2]}</span>
                  </p>
                );
              }
              return <p key={i}>{line}</p>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreTile({ label, value, suffix }: { label: string; value: number | null | undefined; suffix?: string }) {
  const display = value != null ? `${value}${suffix ?? ''}` : '—';
  return (
    <div className="rounded-xl bg-warm-bg/40 px-3 py-2.5">
      <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${value != null ? scoreColor(value) : 'text-foreground/30'}`}>{display}</p>
    </div>
  );
}

function MetaTile({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value && value.trim() ? value : '—';
  return (
    <div className="rounded-xl bg-warm-bg/40 px-3 py-2.5">
      <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${display === '—' ? 'text-foreground/30' : 'text-foreground'}`} style={{ fontFamily: 'var(--font-body)' }}>{display}</p>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  const display = value && String(value).trim() ? String(value) : '—';
  return (
    <div>
      <dt className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>{label}</dt>
      <dd className={`mt-0.5 ${display === '—' ? 'text-foreground/30' : 'text-foreground'} ${mono ? 'font-mono text-[13px]' : ''}`} style={mono ? undefined : { fontFamily: 'var(--font-body)' }}>
        {display}
      </dd>
    </div>
  );
}
