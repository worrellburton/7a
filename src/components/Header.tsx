'use client';

import { useState } from 'react';
import Link from 'next/link';

const navLinks = [
  { label: 'Who We Are', href: '/who-we-are' },
  { label: 'Treatment', href: '/treatment' },
  { label: 'Our Program', href: '/our-program' },
  { label: 'What We Treat', href: '/what-we-treat', active: true },
  { label: 'Tour', href: '/tour' },
  { label: 'Admissions', href: '/admissions' },
  { label: 'Contact', href: '/contact' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white sticky top-0 z-50 shadow-sm" role="banner">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex items-center justify-between h-20 lg:h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0" aria-label="Seven Arrows Recovery - Home">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full border-2 border-primary flex items-center justify-center">
              <svg className="w-8 h-8 lg:w-9 lg:h-9 text-primary" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" />
                <line x1="20" y1="2" x2="20" y2="38" stroke="currentColor" strokeWidth="1" />
                <line x1="2" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="1" />
                <line x1="7" y1="7" x2="33" y2="33" stroke="currentColor" strokeWidth="1" />
                <line x1="33" y1="7" x2="7" y2="33" stroke="currentColor" strokeWidth="1" />
                <circle cx="20" cy="20" r="4" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="text-xl lg:text-2xl font-bold tracking-wider text-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                SEVEN ARROWS
              </div>
              <div className="text-[0.6rem] tracking-[0.3em] text-text-muted uppercase">Recovery</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs xl:text-sm font-medium tracking-wider uppercase transition-colors ${
                  link.active ? 'text-primary' : 'text-foreground hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Phone CTA */}
          <a
            href="tel:+18669964308"
            className="hidden lg:inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-full text-sm font-semibold tracking-wide transition-all"
            aria-label="Call us at (866) 996-4308"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            (866) 996-4308
          </a>

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-6 border-t border-gray-100" role="menu">
            <div className="pt-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-4 py-3 text-sm font-medium tracking-wider uppercase ${
                    link.active ? 'text-primary' : 'text-foreground hover:text-primary'
                  }`}
                  role="menuitem"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="px-4 pt-4">
                <a
                  href="tel:+18669964308"
                  className="btn-primary w-full text-center"
                >
                  (866) 996-4308
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
