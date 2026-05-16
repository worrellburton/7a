'use client';

import { useState } from 'react';
import { DepartmentPageNav } from '../DepartmentPageNav';

export default function DonationsContent() {
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 sm:px-6 lg:px-10 pt-6 pb-4">
        <DepartmentPageNav />
      </div>

      <div className="px-4 sm:px-6 lg:px-10 pb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Donations</h1>
          <p className="text-sm text-foreground/55 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            Track philanthropic giving, donor relationships, and campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-black/10 text-foreground/70 text-[12.5px] font-medium hover:border-foreground/30 hover:text-foreground transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13 6-3m-6 3V7m6 10 5.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 4m0 13V4m-6 3 6-3" />
            </svg>
            Map
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 text-rose-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-foreground">Coming soon</h2>
          <p className="text-sm text-foreground/55 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            Donations tracking is being designed. Check back here for donor lists, campaign tracking, and giving history.
          </p>
        </div>
      </div>

      {mapOpen && (
        <MapModal onClose={() => setMapOpen(false)} />
      )}
    </div>
  );
}

function MapModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/50 p-0 sm:p-6" onClick={onClose}>
      <div
        className="relative w-full max-w-5xl bg-white rounded-none sm:rounded-2xl shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/10">
          <h2 className="text-base font-semibold text-foreground">Donor Map</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground/50 hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-[480px] flex items-center justify-center p-10 text-center">
          <p className="text-sm text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
            Donor map will appear here once donations data is available.
          </p>
        </div>
      </div>
    </div>
  );
}
