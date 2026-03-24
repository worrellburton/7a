import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
      className="fixed bottom-20 left-6 z-40 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 group lg:bottom-8 lg:left-8"
      style={{
        background: dark
          ? 'radial-gradient(circle at 40% 40%, #1e3a5f 0%, #0f1b2d 100%)'
          : 'radial-gradient(circle at 60% 40%, #f59e0b 0%, #ea580c 60%, #9a3412 100%)',
        boxShadow: dark
          ? '0 0 20px rgba(147, 197, 253, 0.3), 0 0 40px rgba(147, 197, 253, 0.1)'
          : '0 0 20px rgba(245, 158, 11, 0.4), 0 0 40px rgba(234, 88, 12, 0.2)',
      }}
    >
      {/* Glow ring */}
      <span
        className="absolute inset-0 rounded-full animate-pulse"
        style={{
          background: dark
            ? 'radial-gradient(circle, rgba(147,197,253,0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(251,191,36,0.2) 0%, transparent 70%)',
          transform: 'scale(1.3)',
        }}
      />

      {/* Sun icon (visible in light mode = click to go dark) */}
      <svg
        className="absolute w-7 h-7 transition-all duration-500"
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
        {/* Sun setting behind horizon line */}
        <circle cx="12" cy="10" r="4" fill="rgba(255,255,255,0.3)" />
        <path d="M12 2v2" />
        <path d="M12 16v2" />
        <path d="M4.93 4.93l1.41 1.41" />
        <path d="M17.66 6.34l1.41-1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        {/* Horizon */}
        <path d="M3 18h18" strokeWidth="1" opacity="0.5" />
      </svg>

      {/* Moon icon (visible in dark mode = click to go light) */}
      <svg
        className="absolute w-6 h-6 transition-all duration-500"
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
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="rgba(255,255,255,0.15)" />
        {/* Stars */}
        <circle cx="6" cy="4" r="0.5" fill="white" opacity="0.6">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="19" cy="8" r="0.4" fill="white" opacity="0.5">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="17" cy="3" r="0.3" fill="white" opacity="0.4">
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.5s" repeatCount="indefinite" />
        </circle>
      </svg>
    </button>
  );
}
