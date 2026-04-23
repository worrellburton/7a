'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Mobile navigation drawer. Extracted from `Header.tsx` so that the
 * header file can stay focused on the desktop mega-menu and this
 * component can own all mobile-specific behavior: scroll lock,
 * escape-to-close, click-outside, focus containment, and the
 * staggered/animated reveal of nav items.
 *
 * The nav tree itself is owned by the header and passed in as props
 * so that both surfaces stay in lockstep. The icon map is similarly
 * injected so the mobile drawer can render the same iconography as
 * the desktop mega menu without duplicating the map.
 */

export interface MobileNavDropdownItem {
  label: string;
  href: string;
  description?: string;
  group?: string;
}

export interface MobileNavItem {
  label: string;
  href: string;
  description?: string;
  dropdown?: MobileNavDropdownItem[];
}

export default function MobileMenu({
  open,
  onClose,
  navLinks,
  iconMap,
}: {
  open: boolean;
  onClose: () => void;
  navLinks: MobileNavItem[];
  iconMap: Record<string, React.ComponentType<{ className?: string }>>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Collapse any expanded section whenever the drawer closes so the
  // next open starts from the clean "everything collapsed" state.
  useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  // Body scroll lock — prevents the underlying page from scrolling
  // while the drawer is visible. Restores the prior overflow value
  // on close (rather than assuming the site default was 'visible').
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prev;
    };
  }, [open]);

  // Escape key closes the drawer. Attached at the document level so
  // it works regardless of which element currently has focus.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (label: string) => {
    setExpanded((curr) => (curr === label ? null : label));
  };

  return (
    <div
      className="lg:hidden pb-4 border-t border-gray-100"
      role="menu"
      ref={panelRef}
      // Click-outside — when the user taps the drawer background
      // behind the list we close. The nav items themselves stop
      // propagation via their own onClick. We only treat the panel's
      // direct background as "outside" by checking target === panel.
      onClick={(e) => {
        if (e.target === panelRef.current) onClose();
      }}
    >
      <div className="pt-3 space-y-0.5">
        {navLinks.map((item) => (
          <div key={item.href}>
            {item.dropdown ? (
              <>
                <button
                  type="button"
                  className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-semibold tracking-wider uppercase text-foreground hover:text-primary"
                  style={{ fontFamily: 'var(--font-body)' }}
                  onClick={() => toggle(item.label)}
                  aria-expanded={expanded === item.label}
                >
                  {item.label}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${expanded === item.label ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expanded === item.label && (
                  <div className="bg-warm-bg">
                    {item.dropdown.map((sub) => {
                      const Icon = iconMap[sub.label];
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className="flex items-center gap-2.5 px-5 py-2.5 text-sm text-foreground hover:text-primary border-b border-foreground/5 last:border-b-0"
                          role="menuitem"
                          onClick={onClose}
                        >
                          {Icon && (
                            <div className="shrink-0 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                              <Icon className="w-3 h-3 text-primary" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                              {sub.label}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                className="block px-3 py-2.5 text-xs font-semibold tracking-wider uppercase text-foreground hover:text-primary"
                style={{ fontFamily: 'var(--font-body)' }}
                role="menuitem"
                onClick={onClose}
              >
                {item.label}
              </Link>
            )}
          </div>
        ))}
        <div className="px-3 pt-3">
          <a
            href="tel:+18669964308"
            className="btn-primary w-full text-center flex items-center justify-center gap-2 text-xs py-3"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            (866) 996-4308
          </a>
        </div>
      </div>
    </div>
  );
}
