'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface DropdownItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href: string;
  dropdown?: DropdownItem[];
}

const navLinks: NavItem[] = [
  {
    label: 'Who We Are',
    href: '/who-we-are',
    dropdown: [
      { label: 'Meet Our Team', href: '/who-we-are/meet-our-team' },
      { label: 'Why Us?', href: '/who-we-are/why-us' },
      { label: 'Our Philosophy', href: '/who-we-are/our-philosophy' },
      { label: 'FAQs', href: '/who-we-are/faqs' },
      { label: 'Blog', href: '/who-we-are/blog' },
      { label: 'Careers', href: '/who-we-are/careers' },
      { label: 'Areas We Serve', href: '/who-we-are/areas-we-serve' },
    ],
  },
  {
    label: 'Treatment',
    href: '/treatment',
    dropdown: [
      { label: 'Residential Inpatient', href: '/treatment/residential-inpatient' },
      { label: 'Detoxification', href: '/treatment/detoxification' },
      { label: 'Interventions', href: '/treatment/interventions' },
      { label: 'Alumni & Aftercare', href: '/treatment/alumni-aftercare' },
    ],
  },
  {
    label: 'Our Program',
    href: '/our-program',
    dropdown: [
      { label: 'Trauma Treatment', href: '/our-program/trauma-treatment' },
      { label: 'Indigenous Approach', href: '/our-program/indigenous-approach' },
      { label: 'Family Program', href: '/our-program/family-program' },
      { label: 'Holistic Approaches', href: '/our-program/holistic-approaches' },
      { label: 'Equine-Assisted Experience', href: '/our-program/equine-assisted' },
      { label: 'Evidence-Based Treatment', href: '/our-program/evidence-based' },
      { label: 'Who We Help', href: '/our-program/who-we-help' },
    ],
  },
  {
    label: 'What We Treat',
    href: '/what-we-treat',
    dropdown: [
      { label: 'Dual-Diagnosis', href: '/what-we-treat/dual-diagnosis' },
      { label: 'Alcohol Addiction', href: '/what-we-treat/alcohol-addiction' },
      { label: 'Heroin Addiction', href: '/what-we-treat/heroin-addiction' },
      { label: 'Marijuana Addiction', href: '/what-we-treat/marijuana-addiction' },
      { label: 'Opioid Addiction', href: '/what-we-treat/opioid-addiction' },
      { label: 'Prescription Drug Addiction', href: '/what-we-treat/prescription-drug-addiction' },
      { label: 'Xanax Addiction', href: '/what-we-treat/xanax-addiction' },
    ],
  },
  { label: 'Tour', href: '/tour' },
  { label: 'Admissions', href: '/admissions' },
  { label: 'Contact', href: '/contact' },
];

function DesktopDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(null);

  const enter = () => {
    if (timeout.current) clearTimeout(timeout.current);
    setOpen(true);
  };

  const leave = () => {
    timeout.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <Link
        href={item.href}
        className="text-xs xl:text-sm font-medium tracking-wider uppercase transition-colors text-foreground hover:text-primary"
      >
        {item.label}
      </Link>
      {open && item.dropdown && (
        <div className="absolute top-full left-0 pt-2 z-50" style={{ minWidth: '240px' }}>
          <div className="bg-warm-card shadow-lg">
            {item.dropdown.map((sub) => (
              <Link
                key={sub.href}
                href={sub.href}
                className="block px-6 py-4 text-sm font-medium text-foreground hover:text-primary border-b border-foreground/10 last:border-b-0 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
                onClick={() => setOpen(false)}
              >
                {sub.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  const toggleMobileDropdown = (label: string) => {
    setMobileExpanded(mobileExpanded === label ? null : label);
  };

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
            {navLinks.map((item) =>
              item.dropdown ? (
                <DesktopDropdown key={item.href} item={item} />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-xs xl:text-sm font-medium tracking-wider uppercase transition-colors text-foreground hover:text-primary"
                >
                  {item.label}
                </Link>
              )
            )}
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
              {navLinks.map((item) => (
                <div key={item.href}>
                  {item.dropdown ? (
                    <>
                      <button
                        type="button"
                        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium tracking-wider uppercase text-foreground hover:text-primary"
                        onClick={() => toggleMobileDropdown(item.label)}
                        aria-expanded={mobileExpanded === item.label}
                      >
                        {item.label}
                        <svg
                          className={`w-4 h-4 transition-transform ${mobileExpanded === item.label ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {mobileExpanded === item.label && (
                        <div className="bg-warm-bg">
                          {item.dropdown.map((sub) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className="block px-8 py-3 text-sm text-foreground hover:text-primary border-b border-foreground/5 last:border-b-0"
                              role="menuitem"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className="block px-4 py-3 text-sm font-medium tracking-wider uppercase text-foreground hover:text-primary"
                      role="menuitem"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
              <div className="px-4 pt-4">
                <a href="tel:+18669964308" className="btn-primary w-full text-center">
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
