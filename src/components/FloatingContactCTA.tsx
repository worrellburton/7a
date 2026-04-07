'use client';

import { useState, useEffect } from 'react';

function ThemeToggleButton() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500"
      style={{
        background: dark
          ? 'radial-gradient(circle at 40% 40%, #1e3a5f 0%, #0f1b2d 100%)'
          : 'radial-gradient(circle at 60% 40%, #f59e0b 0%, #ea580c 60%, #9a3412 100%)',
        boxShadow: dark
          ? '0 0 12px rgba(147, 197, 253, 0.25), 0 0 24px rgba(147, 197, 253, 0.08)'
          : '0 0 12px rgba(245, 158, 11, 0.3), 0 0 24px rgba(234, 88, 12, 0.15)',
      }}
    >
      {/* Sun (light mode) */}
      <svg
        className="absolute w-5 h-5 transition-all duration-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          opacity: dark ? 0 : 1,
          transform: dark ? 'rotate(-90deg) scale(0.5)' : 'rotate(0) scale(1)',
        }}
      >
        <circle cx="12" cy="10" r="4" fill="rgba(255,255,255,0.2)" />
        <path d="M12 2v2" />
        <path d="M12 16v2" />
        <path d="M4.93 4.93l1.41 1.41" />
        <path d="M17.66 6.34l1.41-1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="M3 18h18" strokeWidth="1" opacity="0.4" />
      </svg>
      {/* Moon (dark mode) */}
      <svg
        className="absolute w-5 h-5 transition-all duration-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          opacity: dark ? 1 : 0,
          transform: dark ? 'rotate(0) scale(1)' : 'rotate(90deg) scale(0.5)',
        }}
      >
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="rgba(255,255,255,0.1)" />
        <circle cx="6" cy="4" r="0.5" fill="white" opacity="0.6">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="19" cy="8" r="0.4" fill="white" opacity="0.5">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </svg>
    </button>
  );
}

function StickyPhoneBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
    >
      <a
        href="tel:+18669964308"
        className="flex items-center justify-center gap-3 mx-auto mb-3 max-w-xs bg-primary text-white py-3 px-8 font-normal text-sm tracking-wider rounded-full shadow-[0_4px_20px_rgba(160,82,45,0.4)]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
        </svg>
        <span className="font-light tracking-widest">(866) 996-4308</span>
      </a>
    </div>
  );
}

export default function FloatingContactCTA() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
    <StickyPhoneBar />
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
          <a
            href="/contact"
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-warm-bg transition-colors group mt-0.5"
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
          </a>
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

      {/* Theme toggle + phone button row */}
      <div className="flex items-center gap-2">
        <ThemeToggleButton />

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
    </div>
    </>
  );
}
