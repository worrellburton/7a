'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { dialAircall } from '@/lib/aircall-dial';
import {
  type AircallCallDetail,
  PHOENIX_TZ,
  directionStyle,
  formatDuration,
  formatPhone,
} from '../_shared';

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: PHOENIX_TZ,
  });
}

function sentimentStyle(s: string | null): string {
  switch ((s ?? '').toLowerCase()) {
    case 'positive': return 'bg-emerald-100 text-emerald-700';
    case 'negative': return 'bg-rose-100 text-rose-700';
    case 'neutral': return 'bg-gray-100 text-gray-600';
    default: return 'bg-violet-100 text-violet-700';
  }
}

export default function CallDetailContent() {
  const { session } = useAuth();
  const params = useParams<{ id: string }>();
  const id = params?.id || '';

  const [call, setCall] = useState<AircallCallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/feather/calls/${encodeURIComponent(id)}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch { /* clipboard blocked — no-op */ }
  };

  useEffect(() => {
    if (!id || !session?.access_token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/aircall/${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(data.error || `Couldn't load call (${res.status})`); return; }
        setCall(data.call as AircallCallDetail);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, session?.access_token]);

  if (loading) {
    return <div className="px-4 sm:px-6 lg:px-10 py-10"><div className="h-40 rounded-2xl bg-foreground/5 animate-pulse max-w-3xl" /></div>;
  }

  if (error || !call) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-10">
        <Link href="/feather/calls" className="text-xs text-primary hover:underline" style={{ fontFamily: 'var(--font-body)' }}>← Back to Calls</Link>
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-foreground">Call not found</p>
          <p className="text-xs text-foreground/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>{error || `No call with ID #${id}.`}</p>
        </div>
      </div>
    );
  }

  const callerLabel = call.contact_name || formatPhone(call.raw_digits || call.caller_number);
  const dirKey = (call.direction || '').toLowerCase();
  const dirClass = directionStyle[dirKey] || 'bg-gray-100 text-gray-600';

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">{label}</p>
      <p className="mt-0.5 text-sm text-foreground/80">{value ?? <span className="text-foreground/30">—</span>}</p>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/feather/calls" className="text-xs text-primary hover:underline inline-flex items-center gap-1">← Back to Calls</Link>

      {/* Header */}
      <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{callerLabel}</h1>
          <p className="mt-0.5 text-sm text-foreground/55">{formatDateTime(call.started_at)}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(call.raw_digits || call.caller_number) && (
            <button
              onClick={() => dialAircall(call.raw_digits || call.caller_number)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-wide hover:bg-primary-dark transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Call back
            </button>
          )}
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 border border-white/70 text-[11px] font-semibold uppercase tracking-wide text-foreground/70 hover:bg-white transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 11-5.656-5.656l1.5-1.5m6.656-1.828a4 4 0 000-5.656l-.001-.001a4 4 0 00-5.656 0l-1.5 1.5" />
            </svg>
            {linkCopied ? 'Copied' : 'Copy link'}
          </button>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${dirClass}`}>{call.direction ?? 'call'}</span>
          {call.missed && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-rose-100 text-rose-700">Missed{call.missed_call_reason ? ` · ${call.missed_call_reason}` : ''}</span>}
          {call.voicemail && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-700">Voicemail</span>}
        </div>
      </div>

      {/* Facts */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-2xl border border-white/70 bg-white/55 backdrop-blur px-5 py-4 shadow-sm">
        <Field label="Number" value={formatPhone(call.raw_digits || call.caller_number)} />
        <Field label="Agent" value={call.user_name} />
        <Field label="Line" value={call.number_name} />
        <Field label="Duration" value={formatDuration(call.duration)} />
        <Field label="Status" value={call.status} />
        <Field label="Team" value={(call.teams ?? []).join(', ') || null} />
      </div>

      {/* Recording / voicemail */}
      {(call.recording_url || call.voicemail_url) && (
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/55 backdrop-blur px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">{call.recording_url ? 'Recording' : 'Voicemail'}</p>
            <a
              href={`/api/aircall/recording/${call.aircall_id}?download=1${call.recording_url ? '' : '&type=voicemail'}`}
              download
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download
            </a>
          </div>
          {/* Played through our authenticated proxy: refreshes expired
              Aircall URLs and keeps the (PHI) media URL off the client.
              eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            controls
            preload="none"
            className="w-full"
            src={`/api/aircall/recording/${call.aircall_id}${call.recording_url ? '' : '?type=voicemail'}`}
          />
        </div>
      )}

      {/* AI summary + sentiment + topics */}
      {(call.summary || call.sentiment || (call.topics && call.topics.length > 0)) && (
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/55 backdrop-blur px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">AI summary</p>
            {call.sentiment && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${sentimentStyle(call.sentiment)}`}>{call.sentiment}</span>}
          </div>
          {call.summary && <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{call.summary}</p>}
          {call.topics && call.topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {call.topics.map((t) => <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-foreground/5 text-foreground/60">{t}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Transcript */}
      {call.transcript && (
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/55 backdrop-blur px-5 py-4 shadow-sm">
          <button onClick={() => setShowTranscript((v) => !v)} className="w-full flex items-center justify-between text-left">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Transcript</span>
            <span className="text-xs text-primary font-semibold">{showTranscript ? 'Hide' : 'Show'}</span>
          </button>
          {showTranscript && <p className="mt-3 text-sm text-foreground/75 leading-relaxed whitespace-pre-line">{call.transcript}</p>}
        </div>
      )}

      {/* Tags + comments */}
      {((call.tags && call.tags.length > 0) || (call.comments && call.comments.length > 0)) && (
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/55 backdrop-blur px-5 py-4 shadow-sm">
          {call.tags && call.tags.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {call.tags.map((t) => <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">{t}</span>)}
              </div>
            </div>
          )}
          {call.comments && call.comments.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-1.5">Notes</p>
              <ul className="space-y-1.5">
                {call.comments.map((c, i) => (
                  <li key={i} className="text-sm text-foreground/75">
                    <span className="text-foreground/80">{c.content}</span>
                    {c.posted_by?.name && <span className="text-[11px] text-foreground/40"> — {c.posted_by.name}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
