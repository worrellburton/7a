'use client';

import { useState } from 'react';
import ContactModal from './ContactModal';

// ThemeToggleButton was removed — site is locked to its single
// design palette. Any leftover `dark:` Tailwind classes throughout
// the codebase are dead and only fire if some external script sets
// `<html class="dark">`, which nothing on the site does anymore.

// Note: the mobile sticky call pill that used to live here was
// removed because StickyMobileCTA on the home page (and the inline
// page CTAs elsewhere) already cover the same call-to-action — they
// were overlapping the floating Google rating widget at the bottom.
// Desktop still gets the contact dock on the right.

export default function FloatingContactCTA() {
  const [expanded, setExpanded] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden lg:flex flex-col items-end gap-2">
      {/* Expanded contact options */}
      {expanded && (
        <div
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-60 mb-1"
          style={{ animation: 'fadeSlideUp 0.25s ease-out' }}
        >
          <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
            Get in Touch
          </p>
          <a
            href="tel:+18669964308"
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-warm-bg transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Call Now</p>
              <p className="text-[10px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>(866) 996-4308</p>
            </div>
          </a>
          <button
            type="button"
            onClick={() => { setContactOpen(true); setExpanded(false); }}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-warm-bg transition-colors group mt-0.5 text-left"
          >
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Contact Us</p>
              <p className="text-[10px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>Send a message</p>
            </div>
          </button>
          <a
            href="/admissions#verify"
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-warm-bg transition-colors group mt-0.5"
          >
            <div className="w-8 h-8 rounded-full bg-primary-dark flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Verify Insurance</p>
              <p className="text-[10px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>Free & confidential</p>
            </div>
          </a>
        </div>
      )}

      {/* Phone button row (theme toggle removed — single palette) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-12 h-12 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all group"
          aria-label={expanded ? 'Close contact options' : 'Contact us'}
          style={{ boxShadow: '0 4px 16px rgba(160, 82, 45, 0.35)' }}
        >
          {expanded ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          )}
        </button>
      </div>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
