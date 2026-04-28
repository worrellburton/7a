'use client';

import { ScoreRow } from './_shared';

// Compact inline popover shown when the user clicks the score badge.
// Shows strengths / coaching notes only — NOT the full expanded detail.
export function ScoreMiniPopover({ score, scoring, error, onClose, onRescore }: {
  score: ScoreRow | null;
  scoring: boolean;
  error?: string;
  onClose: () => void;
  onRescore: () => void;
}) {
  return (
    <div style={{ fontFamily: 'var(--font-body)' }} className="flex flex-col gap-3">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2">
          <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wider">Analysis failed</p>
            <p className="text-xs text-red-800 mt-0.5 break-words">{error}</p>
          </div>
        </div>
      )}
      <div className="flex items-start gap-4">
      {score ? (
        <>
          <div className="flex-1 grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50/80 border border-emerald-100 p-2.5">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Strengths</p>
              {score.operator_strengths?.length > 0 ? (
                <ul className="text-xs text-emerald-900/80 space-y-0.5 list-disc pl-4">
                  {score.operator_strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-emerald-900/50 italic">No strengths noted</p>
              )}
            </div>
            <div className="rounded-lg bg-red-50/80 border border-red-100 p-2.5">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Areas to coach</p>
              {score.operator_weaknesses?.length > 0 ? (
                <ul className="text-xs text-red-900/80 space-y-0.5 list-disc pl-4">
                  {score.operator_weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-red-900/50 italic">No weaknesses identified</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button type="button" onClick={onRescore} disabled={scoring} className="text-[10px] font-semibold px-2 py-1 rounded-md text-foreground/60 hover:text-primary hover:bg-white border border-gray-200 disabled:opacity-50">{scoring ? 'Analyzing…' : 'Re-analyze'}</button>
            <button type="button" onClick={onClose} className="text-[10px] font-semibold px-2 py-1 rounded-md text-foreground/40 hover:text-foreground/70 hover:bg-white border border-gray-200">Close</button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-between gap-4">
          <p className="text-xs text-foreground/50 italic">{error ? 'Analysis could not complete.' : 'No analysis yet for this call.'}</p>
          <div className="flex gap-1">
            <button type="button" onClick={onRescore} disabled={scoring} className="text-[10px] font-semibold px-2 py-1 rounded-md text-primary hover:bg-white border border-primary/30 disabled:opacity-50">{scoring ? 'Analyzing…' : error ? 'Try again' : 'Analyze now'}</button>
            <button type="button" onClick={onClose} className="text-[10px] font-semibold px-2 py-1 rounded-md text-foreground/40 hover:text-foreground/70 hover:bg-white border border-gray-200">Close</button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
