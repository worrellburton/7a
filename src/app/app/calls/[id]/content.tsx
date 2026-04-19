'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
  const [linkCopied, setLinkCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/app/calls/${encodeURIComponent(id)}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {}
  };

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
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-gray-200 text-foreground/70 hover:border-primary/30 hover:text-primary transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
              title="Copy link to this call"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
              {linkCopied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-10 space-y-4">
        {call.audio_url && (
          <RecordingPlayer src={call.audio_url} />
        )}
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

function fmtAudioTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function RecordingPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const ensureAudio = (): HTMLAudioElement => {
    if (!audioRef.current) {
      const a = new Audio(src);
      a.preload = 'metadata';
      a.playbackRate = rate;
      a.ontimeupdate = () => setTime(a.currentTime || 0);
      a.onloadedmetadata = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
      a.ondurationchange = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
      a.onended = () => { setPlaying(false); setTime(a.duration || 0); };
      a.onerror = () => { setError(true); setPlaying(false); };
      audioRef.current = a;
    }
    return audioRef.current;
  };

  const toggle = () => {
    const a = ensureAudio();
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => { setError(true); setPlaying(false); });
    }
  };

  const seek = (t: number) => {
    const a = ensureAudio();
    a.currentTime = Math.max(0, Math.min(t, a.duration || t));
    setTime(a.currentTime);
  };

  const skip = (delta: number) => seek((audioRef.current?.currentTime || 0) + delta);

  const cycleRate = () => {
    const seq = [1, 1.25, 1.5, 1.75, 2, 0.75];
    const next = seq[(seq.indexOf(rate) + 1) % seq.length] || 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const onScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-4xl">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[11px] font-medium text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
          Recording
        </p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium text-foreground/50 hover:text-primary inline-flex items-center gap-1"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download
        </a>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={error}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors shrink-0 ${error ? 'bg-gray-100 text-foreground/30 cursor-not-allowed' : playing ? 'bg-primary text-white' : 'bg-foreground text-white hover:bg-foreground/85'}`}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => skip(-15)}
          disabled={error}
          title="Back 15s"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-warm-bg/60 hover:bg-warm-bg text-foreground/70 transition-colors shrink-0 disabled:opacity-40"
        >
          <span className="text-[10px] font-bold" style={{ fontFamily: 'var(--font-body)' }}>−15</span>
        </button>
        <button
          type="button"
          onClick={() => skip(15)}
          disabled={error}
          title="Forward 15s"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-warm-bg/60 hover:bg-warm-bg text-foreground/70 transition-colors shrink-0 disabled:opacity-40"
        >
          <span className="text-[10px] font-bold" style={{ fontFamily: 'var(--font-body)' }}>+15</span>
        </button>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-mono text-foreground/60 w-10 text-right tabular-nums">{fmtAudioTime(time)}</span>
          <div
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={time}
            onClick={onScrubberClick}
            className="flex-1 h-2 rounded-full bg-warm-bg cursor-pointer relative overflow-hidden"
          >
            <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-[width] duration-150" style={{ width: `${pct}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary border-2 border-white shadow"
              style={{ left: `calc(${pct}% - 7px)` }}
            />
          </div>
          <span className="text-[11px] font-mono text-foreground/40 w-10 tabular-nums">{duration > 0 ? fmtAudioTime(duration) : '--:--'}</span>
        </div>
        <button
          type="button"
          onClick={cycleRate}
          disabled={error}
          title="Playback speed"
          className="px-2.5 h-9 rounded-full flex items-center justify-center bg-warm-bg/60 hover:bg-warm-bg text-foreground/70 text-[11px] font-semibold transition-colors shrink-0 disabled:opacity-40"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {rate}×
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[11px] text-red-600" style={{ fontFamily: 'var(--font-body)' }}>
          Couldn&rsquo;t load this recording. Try opening it in a new tab.
        </p>
      )}
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
