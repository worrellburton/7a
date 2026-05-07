'use client';

import {
  Call,
  directionStyle,
  formatDate,
  formatDuration,
  formatTime,
} from './_shared';
import { DetailField } from './Pickers';

// Expanded row contents: caller identity, key metadata strip, tags +
// notes + recording, then the full CTM metadata grid in a
// details/summary at the bottom. The per-call AI analysis (summary,
// operator score, fit, sentiment, transcript) used to live here —
// it's been removed along with the rest of the call-AI surface.
export function CallDetail({ call }: { call: Call }) {
  return (
    <div style={{ fontFamily: 'var(--font-body)' }} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start gap-4 flex-wrap pb-4 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            {call.name && call.name !== 'Unknown'
              ? call.name
              : call.caller_number_formatted || call.caller_number || 'Unknown caller'}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${directionStyle[call.direction] || 'bg-gray-100 text-gray-600'}`}>
              {call.direction || 'unknown'}
            </span>
            {call.voicemail && (
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
                Voicemail
              </span>
            )}
            {call.first_call && (
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700">
                First-time caller
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Key metadata strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 py-4 border-b border-gray-100">
        <DetailField label="Called at" value={`${formatDate(call.called_at)} · ${formatTime(call.called_at)}`} />
        <DetailField label="Duration" value={`${formatDuration(call.duration)}${call.talk_time ? ` (${formatDuration(call.talk_time)} talk)` : ''}`} />
        <DetailField label="Source" value={call.source_name || call.source} />
        <DetailField label="Location" value={[call.city, call.state].filter(Boolean).join(', ')} />
      </div>

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
          <DetailField label="CTM lead score" value={call.score != null ? String(call.score) : undefined} />
          <DetailField label="First call" value={call.first_call ? 'Yes' : undefined} />
          <DetailField label="Voicemail" value={call.voicemail ? 'Yes' : undefined} />
          <DetailField label="Called at" value={`${formatDate(call.called_at)} · ${formatTime(call.called_at)}`} />
        </div>
      </details>
    </div>
  );
}
