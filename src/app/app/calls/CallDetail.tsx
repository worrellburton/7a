'use client';

import {
  Call,
  ScoreRow,
  clientTypeBg,
  directionStyle,
  fitScoreBg,
  formatDate,
  formatDuration,
  formatTime,
  scoreColorHex,
  sentimentStyle,
} from './_shared';
import { DetailField } from './Pickers';

// Expanded row contents: key metadata at top, AI analysis integrated with it,
// then full metadata grid tucked in a details/summary at the bottom.
export function CallDetail({
  call,
  score,
  scoring,
  error,
  onRescore,
}: {
  call: Call;
  score: ScoreRow | null;
  scoring: boolean;
  error?: string;
  onRescore: (callId: string, force: boolean) => void;
}) {
  return (
    <div style={{ fontFamily: 'var(--font-body)' }} onClick={(e) => e.stopPropagation()}>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2">
          <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wider">Analysis failed</p>
            <p className="text-xs text-red-800 mt-0.5 break-words">{error}</p>
          </div>
        </div>
      )}
      {/* Header: score + caller + operator + sentiment + rescore */}
      <div className="flex items-start gap-4 flex-wrap pb-4 border-b border-gray-100">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0"
          style={{ backgroundColor: score ? scoreColorHex(score.score) : '#e5e7eb', color: score ? '#fff' : '#9ca3af' }}
          title={score ? `AI score ${score.score}/100` : 'Not scored yet'}
        >
          {score ? score.score : '—'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            {score?.caller_name || (call.name && call.name !== 'Unknown' ? call.name : call.caller_number_formatted || call.caller_number || 'Unknown caller')}
          </h3>
          {score?.caller_interest && (
            <p className="text-sm text-foreground/70 mt-0.5">{score.caller_interest}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {score?.operator_name && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                Operator: {score.operator_name}
              </span>
            )}
            {score?.client_type && (
              <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${clientTypeBg(score.client_type)}`}>
                {score.client_type}
              </span>
            )}
            {score?.fit_score != null && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-white ${fitScoreBg(score.fit_score)}`}>
                Fit: {score.fit_score}
              </span>
            )}
            {score?.sentiment && (
              <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${sentimentStyle(score.sentiment)} capitalize`}>
                {score.sentiment}
              </span>
            )}
            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${directionStyle[call.direction] || 'bg-gray-100 text-gray-600'}`}>
              {call.direction || 'unknown'}
            </span>
            {call.voicemail && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">Voicemail</span>}
            {call.first_call && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700">First-time caller</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRescore(String(call.id), true)}
          disabled={scoring}
          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-foreground/60 hover:text-primary hover:bg-white transition-colors border border-gray-200 disabled:opacity-50 flex items-center gap-1.5"
          title="Run AI analysis on this call"
        >
          <svg className={`w-3.5 h-3.5 ${scoring ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
          {scoring ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {/* Key metadata strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 py-4 border-b border-gray-100">
        <DetailField label="Called at" value={`${formatDate(call.called_at)} · ${formatTime(call.called_at)}`} />
        <DetailField label="Duration" value={`${formatDuration(call.duration)}${call.talk_time ? ` (${formatDuration(call.talk_time)} talk)` : ''}`} />
        <DetailField label="Source" value={call.source_name || call.source} />
        <DetailField label="Location" value={[call.city, call.state].filter(Boolean).join(', ')} />
      </div>

      {/* AI analysis body */}
      {score ? (
        <div className="pt-4 space-y-4">
          {/* Badge metadata-only analyses so it's obvious why the
              summary is more cautious — saves the "this looks wrong"
              moment when Claude can't actually hear the call. When the
              audio downloaded fine but Gemini errored (long calls
              were silently falling back to metadata-only), surface the
              actual error instead of pretending no audio existed. */}
          {typeof score.model === 'string' && score.model.startsWith('claude:') && (() => {
            const audioStatus = score.debug_info?.audio_status ?? null;
            const audioDownloaded = typeof audioStatus === 'string' && audioStatus.startsWith('downloaded');
            const analyzerError = score.debug_info?.analyzer_error ?? null;
            return (
              <div className="rounded-xl bg-amber-50/70 border border-amber-200 px-3 py-2 flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {audioDownloaded ? (
                  <p className="text-[11px] text-amber-900/90 leading-snug">
                    Metadata-only analysis — the recording downloaded but the
                    audio analyzer failed, so we fell back to a metadata-only
                    summary. Click Re-analyze to retry.
                    {analyzerError && (
                      <>
                        {' '}<span className="text-amber-800/70">({analyzerError.length > 220 ? analyzerError.slice(0, 220) + '…' : analyzerError})</span>
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-900/90 leading-snug">
                    Metadata-only analysis — no audio was available. Summary and
                    coaching are limited to what the call record tells us. Click
                    Re-analyze once the recording is attached.
                  </p>
                )}
              </div>
            );
          })()}
          {score.summary && (
            <div>
              <p className="text-[11px] font-bold text-foreground/50 uppercase tracking-wider mb-1">Summary</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{score.summary}</p>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            {score.operator_strengths?.length > 0 && (
              <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5">Operator strengths</p>
                <ul className="text-xs text-emerald-900/80 space-y-1 list-disc pl-4">
                  {score.operator_strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            <div className="rounded-xl bg-red-50/60 border border-red-100 p-3">
              <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1.5">Areas to coach</p>
              {score.operator_weaknesses?.length > 0 ? (
                <ul className="text-xs text-red-900/80 space-y-1 list-disc pl-4">
                  {score.operator_weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-red-900/50 italic">No weaknesses identified</p>
              )}
            </div>
          </div>
          {score.next_steps && (
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
              <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Recommended next step</p>
              <p className="text-sm text-foreground/80">{score.next_steps}</p>
            </div>
          )}
          <p className="text-[10px] text-foreground/30">
            Scored {new Date(score.scored_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
      ) : (
        <div className="pt-4 text-sm text-foreground/40">
          {scoring ? 'Running AI analysis on this call…' : 'No AI analysis yet. Click Score now.'}
        </div>
      )}

      {/* Tags + Notes + Recording */}
      {call.tag_list && call.tag_list.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {call.tag_list.map((tag, i) => (
              <span key={i} className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{tag}</span>
            ))}
          </div>
        </div>
      )}
      {call.notes && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1">Notes</p>
          <p className="text-sm text-foreground/70 whitespace-pre-wrap">{call.notes}</p>
        </div>
      )}
      {call.audio && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5">Recording</p>
          <audio controls src={call.audio} className="h-9 w-full max-w-md" />
        </div>
      )}

      {/* Everything else */}
      <details className="mt-4 pt-4 border-t border-gray-100 group">
        <summary className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider cursor-pointer select-none hover:text-foreground/70">
          All call metadata
        </summary>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm mt-3">
          <DetailField label="Caller name" value={call.name && call.name !== 'Unknown' ? call.name : undefined} />
          <DetailField label="Caller number" value={call.caller_number_formatted || call.caller_number} />
          <DetailField label="Tracking number" value={call.tracking_number_formatted || call.tracking_number} />
          <DetailField label="Tracking label" value={call.tracking_label} />
          <DetailField label="Receiving number" value={call.receiving_number_formatted || call.receiving_number} />
          <DetailField label="Business number" value={call.business_number} />
          <DetailField label="Source" value={call.source_name || call.source} />
          <DetailField label="Status" value={call.status} />
          <DetailField label="Direction" value={call.direction} />
          <DetailField label="Total duration" value={formatDuration(call.duration)} />
          <DetailField label="Talk time" value={call.talk_time ? formatDuration(call.talk_time) : undefined} />
          <DetailField label="Ring time" value={call.ring_time ? formatDuration(call.ring_time) : undefined} />
          <DetailField label="Location" value={[call.city, call.state, call.zip].filter(Boolean).join(', ')} />
          <DetailField label="Country" value={call.country} />
          <DetailField label="CTM score" value={call.score != null ? String(call.score) : undefined} />
          <DetailField label="First call" value={call.first_call ? 'Yes' : undefined} />
          <DetailField label="Voicemail" value={call.voicemail ? 'Yes' : undefined} />
          <DetailField label="Called at" value={`${formatDate(call.called_at)} · ${formatTime(call.called_at)}`} />
        </div>
      </details>
    </div>
  );
}
