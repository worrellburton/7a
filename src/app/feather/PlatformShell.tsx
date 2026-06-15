'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import ChatRail from './chat/ChatRail';
import { useSidebarFlip } from './sidebar-flip';
import Link from '@/components/HoverPrefetchLink';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { usePagePermissions, type PageConfig } from '@/lib/PagePermissions';
import { db } from '@/lib/db';
import PageGuard from '@/lib/PageGuard';
import { ALUMNI_ADMIN_PATHS, ALUMNI_VIEWABLE_PATHS } from '@/lib/alumni-admin-paths';
import PageViewers from './PageViewers';
import { PresenceCursors } from '@/components/PresenceCursors';
import CommandPalette from '@/components/CommandPalette';
import FlowBackground from './FlowBackground';
import LoginScreen, { HeroGallery } from './LoginScreen';
import LeverPullListener from '@/components/LeverPullListener';
import ContactSubmissionToasts from '@/components/ContactSubmissionToasts';

interface NavDepartment {
  id: string;
  name: string;
  color: string | null;
  display_order: number | null;
  hidden: boolean;
}

/* ── Nav Items ──────────────────────────────────────────────────── */

/* ── Icon Map ─────────────────────────────────────────────────── */

// Lucide-derived icon set. Stroke 1.75 at 24-viewBox reads well at w-5 h-5.
// Meaning-first: Facilities=building (not wrench), Equine=horseshoe,
// Billing=receipt, Calendar=dated grid.
const pageIcons: Record<string, React.ReactNode> = {
  // Home — same circle-of-dots community glyph the alumni Home
  // uses, so 'Home' reads the same across both portals.
  '/feather': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="20" cy="12" r="1.5" />
      <circle cx="12" cy="20" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="17.5" cy="6.5" r="1.2" />
      <circle cx="17.5" cy="17.5" r="1.2" />
      <circle cx="6.5" cy="17.5" r="1.2" />
      <circle cx="6.5" cy="6.5" r="1.2" />
    </svg>
  ),
  // Alumni-side My Profile uses the same person glyph as staff
  // so 'My Profile' reads consistently across both portals.
  '/feather/alumni/profile': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  '/feather/profile': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  '/feather/facilities': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
    </svg>
  ),
  // Identity icon — a stylised badge (shield with a stamp at the
  // centre) so it reads as "who we are / our mark" alongside the
  // Facilities building icon above it. Same 24-viewBox / stroke 1.75
  // as the rest of the rail.
  '/feather/identity': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4 6v6c0 4.5 3.2 8.4 8 9 4.8-.6 8-4.5 8-9V6l-8-3Z" />
      <circle cx="12" cy="11" r="2.25" />
      <path d="M12 13.25v3.25" />
    </svg>
  ),
  '/feather/departments': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="7" height="13" rx="1" />
      <rect x="14" y="4" width="7" height="16" rx="1" />
      <path d="M6 11h1M6 14h1M6 17h1M17 8h1M17 11h1M17 14h1M17 17h1" />
    </svg>
  ),
  '/feather/finance': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 4 4 5-6" />
      <path d="M15 9h5v5" />
    </svg>
  ),
  '/feather/reports': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h2v5H8zM12 10h2v8h-2zM16 15h2v3h-2z" />
    </svg>
  ),
  '/feather/job-descriptions': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M2 13h20" />
      <path d="M10 13v2h4v-2" />
    </svg>
  ),
  '/feather/org-chart': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v3M6 16v-2a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2" />
    </svg>
  ),
  '/feather/compliance': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  '/feather/groups': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  '/feather/calendar': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  '/feather/equine': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V10a7 7 0 0 1 14 0v11" />
      <circle cx="5" cy="21" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="21" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  '/feather/billing': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  ),
  '/feather/mercury': (
    // Stylised bank / vault — Mercury's brand uses a thunderbolt, but
    // we want the rail icon to read as "bookkeeping" first, brand
    // second. Columned facade keeps it instantly recognisable at the
    // 20px sidebar size.
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10 12 4l9 6" />
      <path d="M4 10v9" />
      <path d="M20 10v9" />
      <path d="M8 10v9" />
      <path d="M12 10v9" />
      <path d="M16 10v9" />
      <path d="M3 20h18" />
    </svg>
  ),
  '/feather/fleet': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="11" width="16" height="7" rx="2" />
      <path d="M17 11V7a2 2 0 0 1 2-2h1l3 5v7a1 1 0 0 1-1 1h-1" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M17 18h-3M9 18H1" />
    </svg>
  ),
  '/feather/calls': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  '/feather/reviews': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  // Levers icon — slider/lever motif so the metaphor reads at a
  // glance even before hovering the label.
  '/feather/levers': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="14" cy="6" r="2" fill="currentColor" />
      <circle cx="8" cy="12" r="2" fill="currentColor" />
      <circle cx="17" cy="18" r="2" fill="currentColor" />
    </svg>
  ),
  // Kaizen — multi-sparkle reads as "AI-driven daily insight" and
  // pairs visually with the Claude-backed scan that powers the page.
  '/feather/kaizen': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 15.8l-1.6-4.8L6 9.4l4.4-1.6z" />
      <path d="M19 14l.7 2.1 2.1.7-2.1.7L19 19.6l-.7-2.1-2.1-.7 2.1-.7z" />
      <path d="M5 16l.6 1.8L7.4 18.4l-1.8.6L5 20.8l-.6-1.8L2.6 18.4l1.8-.6z" />
    </svg>
  ),
  // HIPAA audit · shield + check glyph, the compliance metaphor.
  '/feather/hipaa': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  // Daily touchpoint logs — a stack of horizontal logs (🪵), to
  // echo the wood-stack metaphor the page itself uses for each
  // recorded contact.
  // Logs · the one emoji icon in the rail. Every other entry uses
  // a stroked SVG glyph to keep the sidebar visually uniform; logs
  // gets the literal 🪵 wood-log emoji as a small wink so the row
  // is instantly identifiable when scanning a long sidebar.
  '/feather/logs': (
    <span className="w-5 h-5 inline-flex items-center justify-center text-[18px] leading-none" aria-hidden="true">
      🪵
    </span>
  ),
  '/feather/website-requests': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v12H5.17L4 17.17V4z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  ),
  // Landing page editor — "play" triangle inside a browser-frame
  // outline reads as "video timeline that lives on the public site".
  '/feather/landing': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 8h18" />
      <path d="M10 11.5l4 2.5-4 2.5z" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Social Media — three nodes connected to a center hub reads as
  // "compose once, broadcast to every channel," matching what the
  // page actually does (one Ayrshare post → multiple platforms).
  '/feather/social-media': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="2.25" />
      <circle cx="6" cy="12" r="2.25" />
      <circle cx="18" cy="19" r="2.25" />
      <path d="M8.05 11.05 15.95 6.45" />
      <path d="M8.05 12.95 15.95 17.55" />
    </svg>
  ),
  // Email Campaigns — envelope with a small sparkle in the corner so
  // the icon reads as "AI-built outbound mail" instead of a plain
  // inbox glyph (which would collide visually with Notes / website
  // requests).
  '/feather/email-campaigns': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
      <path d="M19 3v2M21 4h-2" />
    </svg>
  ),
  // Connect-4 — a 3-column board glyph with one filled chip,
  // signalling "play / game" without leaning on a generic
  // gamepad icon that would clash with the otherwise hand-drawn
  // line-art set.
  '/feather/games/connect4': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8" cy="9" r="1.6" />
      <circle cx="12" cy="9" r="1.6" />
      <circle cx="16" cy="9" r="1.6" />
      <circle cx="8" cy="15" r="1.6" />
      <circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="15" r="1.6" />
    </svg>
  ),
  // Hardware — laptop silhouette with a small line representing
  // the screen-bezel hinge and a base stand, signalling "tracked
  // physical asset" without leaning on a generic box icon.
  '/feather/hardware': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M2 19h20" />
      <path d="M10 16h4" />
    </svg>
  ),
  '/feather/team': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <circle cx="18" cy="11" r="3" />
      <path d="m22 15-1.5-1.5M22 7l-1.5 1.5" />
    </svg>
  ),
  '/feather/pages': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8M16 13H8M16 17H8" />
    </svg>
  ),
  '/feather/apis': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="8" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  '/feather/user-permissions': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />
      <path d="m9.5 12 2 2 3.5-4" />
    </svg>
  ),
  '/feather/activity': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9-6-18-3 9H2" />
    </svg>
  ),
  '/feather/tours': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13 6-3m-6 3V7m6 10 5.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 4m0 13V4m-6 3 6-3" />
    </svg>
  ),
  '/feather/notes': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4a2 2 0 0 1 2-2h10l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M16 2v4h4" />
      <path d="M8 11h8M8 15h8M8 19h5" />
    </svg>
  ),
  '/feather/policies': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4h6l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M14 4v4h4" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  '/feather/kingdom-requests': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  ),
  '/feather/clients': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  '/feather/partnerships': (
    // Two interlocking handshake / network nodes — referral partners
    // are people connected to other people, so the visual is two
    // linked circles bridged by a path.
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="12" r="3" />
      <circle cx="17" cy="12" r="3" />
      <path d="M10 12h4" />
      <path d="M5 7l-1.5-1.5M19 7l1.5-1.5M5 17l-1.5 1.5M19 17l1.5 1.5" />
    </svg>
  ),
  '/feather/contacts': (
    // Marketing (formerly Outreach) — megaphone glyph for broadcasting
    // to referrers, leads, and downgraded partners.
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" />
      <path d="M15 8a4 4 0 0 1 0 8" />
      <path d="M18 5a8 8 0 0 1 0 14" />
    </svg>
  ),
  '/feather/donations': (
    // Donations — hand offering a heart-coin so the icon conveys
    // "philanthropy / giving" without leaning on a literal $.
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />
    </svg>
  ),
  '/feather/incoming-users': (
    // Inbox + person — incoming sign-ins waiting for triage.
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13l3-7h12l3 7" />
      <path d="M3 13v6a2 2 0 002 2h14a2 2 0 002-2v-6" />
      <path d="M3 13h4l1 2h8l1-2h4" />
      <circle cx="12" cy="9" r="1.6" />
    </svg>
  ),
  '/feather/admin': (
    // Sliders — platform configuration hub.
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="8" cy="6" r="1.6" />
      <circle cx="16" cy="12" r="1.6" />
      <circle cx="8" cy="18" r="1.6" />
    </svg>
  ),
  // Arcade — a tiny arcade-cabinet glyph (joystick + buttons).
  '/feather/arcade': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M9 10v2" />
      <path d="M9 11h-1" />
      <path d="M9 11h1" />
      <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="17" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <path d="M7 20h10" />
      <path d="M9 17v3" />
      <path d="M15 17v3" />
    </svg>
  ),
  '/feather/chat': (
    // Speech bubble — alumni + team chat room.
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  '/feather/intake-paperwork': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 11.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V4.5A2.25 2.25 0 016 2.25h2.25m3.75 11.25v2.25m0 0l-3-3m3 3l3-3" />
    </svg>
  ),
  '/feather/document-manager': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.25 3.104c.251.023.501.05.75.082M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.394 13.94-1.425-1.425m-3.104-.196h.008v.008h-.008v-.008ZM8.25 21h7.5A2.25 2.25 0 0 0 18 18.75V9A2.25 2.25 0 0 0 15.75 6.75h-7.5A2.25 2.25 0 0 0 6 9v9.75A2.25 2.25 0 0 0 8.25 21Z" />
      <path d="M9 12.75h6M9 15.75h4" />
    </svg>
  ),
  '/feather/images': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  ),
  '/feather/radio': (
    // Radio set — box with an antenna, dial, and speaker grille.
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="11" rx="2" />
      <path d="M7 9 17 4" />
      <circle cx="9" cy="14.5" r="2.25" />
      <path d="M15 13h3M15 16h3" />
    </svg>
  ),
  '/feather/seo': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <path d="M8 11h6M11 8v6" />
    </svg>
  ),
  '/feather/content': (
    // Page with a pen tip — composing long-form blog content.
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M14 4v5h5" />
      <path d="m14.5 13.5-4 4-2 .5.5-2 4-4z" />
      <path d="m13.5 12.5 1.4-1.4a1.2 1.2 0 0 1 1.7 0l.3.3a1.2 1.2 0 0 1 0 1.7l-1.4 1.4" />
    </svg>
  ),
  '/feather/geo': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </svg>
  ),
  '/feather/analytics': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-6 4 4 5-9" />
    </svg>
  ),
  '/feather/video': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m22 8-6 4 6 4V8z" />
    </svg>
  ),
  '/feather/website': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </svg>
  ),
  // ── Alumni portal ──────────────────────────────────────────
  // Hub: a circle of small dots around a center — the community
  // metaphor that also reads in the sidebar search.
  '/feather/alumni': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="20" cy="12" r="1.5" />
      <circle cx="12" cy="20" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="17.5" cy="6.5" r="1.2" />
      <circle cx="17.5" cy="17.5" r="1.2" />
      <circle cx="6.5" cy="17.5" r="1.2" />
      <circle cx="6.5" cy="6.5" r="1.2" />
    </svg>
  ),
  // Map: classic folded-map glyph
  // Reunion: a calendar with a small star — the headline event
  '/feather/alumni/reunion': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <path d="M12 12.5l.9 1.8 2 .3-1.45 1.4.34 2-1.79-.94-1.79.94.34-2L9.1 14.6l2-.3.9-1.8z" fill="currentColor" stroke="none" />
    </svg>
  ),
  '/feather/alumni/map': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
      <circle cx="12" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Alumni roster — list with a person silhouette. Reads as
  // "address book of people" without overlapping the team/people
  // glyph used elsewhere in the sidebar.
  '/feather/alumni-roster': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="9" cy="10" r="2.25" />
      <path d="M5.5 17c.5-1.8 2-3 3.5-3s3 1.2 3.5 3" />
      <path d="M15 9h3.5" />
      <path d="M15 12.5h3.5" />
      <path d="M5.5 20.5h13" />
    </svg>
  ),
  // Peer support: phone handset
  '/feather/alumni/peer-support': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  // Meetups: two people / handshake
  '/feather/alumni/meetups': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
      <circle cx="17" cy="6" r="2.5" />
      <path d="M22 21v-1.5a3 3 0 0 0-3-3h-1" />
    </svg>
  ),
  // Scholarships: graduation cap
  '/feather/alumni/scholarships': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c3 2.5 9 2.5 12 0v-5" />
      <path d="M22 10v6" />
    </svg>
  ),
  // Resources: open book / library
  '/feather/alumni/resources': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v17H6.5a2.5 2.5 0 0 0 0 5H20" />
      <path d="M8 6h8M8 10h8" />
    </svg>
  ),
  // Voices & talks: speech bubble with quote mark
  '/feather/alumni/stories': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path d="M9 9c.5 0 1 .5 1 1 0 .8-.5 1.3-1 1.5M14 9c.5 0 1 .5 1 1 0 .8-.5 1.3-1 1.5" />
    </svg>
  ),
  // Moderation: shield (staff-only review queue)
  '/feather/alumni/moderation': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
};

function getPageIcon(path: string, size: 'sm' | 'md' = 'md') {
  const icon = pageIcons[path];
  if (!icon) return null;
  if (size === 'sm') {
    // Clone with smaller class - icons already use w-5 h-5 but popup uses w-4 h-4
    return <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>;
  }
  return icon;
}

export { pageIcons };

/**
 * Seven Arrows brand mark for the sidebar / mobile drawer header.
 * A copper-gradient pill containing a feather glyph — a quieter nod
 * to the Seven Arrows name than the literal "7A" wordmark we used to
 * carry. A pulsing radial glow halo sits behind it, breathing on a
 * slow loop so the brand feels alive without being noisy. The
 * feather&rsquo;s spine has a subtle drift animation so the icon
 * reads as in-motion rather than static. Two sizes — md for the
 * pinned desktop sidebar, sm for the compact mobile drawer header.
 *
 * The orbit centerpiece on /app still renders "7A" — that mark stays
 * as the centered identity anchor; this badge is the chrome anchor.
 */
function SevenArrowsLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 20 : 18;
  return (
    <span
      className="inline-flex items-center justify-center text-primary"
      aria-label="Seven Arrows Recovery"
    >
      <svg
        aria-hidden="true"
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Lucide-style feather glyph */}
        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
        <line x1="16" y1="8" x2="2" y2="22" />
        <line x1="17.5" y1="15" x2="9" y2="15" />
      </svg>
    </span>
  );
}

export default function PlatformShell({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, isSuperAdmin, isAlumniAdmin, departmentId, status, userKind, sidebarRecentPaths, sidebarClickCount, recordSidebarVisit, signInWithGoogle, signOut, session, avatarUrl, refreshProfile } = useAuth();
  const isAlumni = userKind === 'alumni';
  const { navPages, popupPages, isPageAllowedForDepartment, isPageAllowedForDepartmentSet, userOverrides, userExtraDepartmentIds } = usePagePermissions();
  const pathname = usePathname();
  const router = useRouter();
  // Chat gets its own sidebar experience: while anywhere under
  // /feather/chat the page nav swaps for the conversation rail
  // (back button + Everybody + DM threads).
  const isChatMode = pathname === '/feather/chat' || pathname?.startsWith('/feather/chat/');
  // Home pins the desktop rail open (expanded, not the collapsed
  // icon-rail); every inner page keeps the hover-to-expand behaviour.
  // Alumni home is /feather/alumni; staff home is /feather. Chat mode
  // swaps the rail for the conversation pane, so never pin there.
  const railPinnedOpen = !isChatMode && pathname === (isAlumni ? '/feather/alumni' : '/feather');
  const [navDepartments, setNavDepartments] = useState<NavDepartment[]>([]);
  // Counts of "new" submissions per nav path. Currently only powers
  // the badge on /app/website-requests; the structure leaves room for
  // other inboxes later.
  const [navBadges, setNavBadges] = useState<Record<string, number>>({});

  // Refresh the website-requests count on mount, on tab focus, and on
  // a slow interval. Endpoint allows admins + Marketing & Admissions
  // members; mirror that gate here so we don't 403-spam in the console
  // for users who can't see the page anyway.
  const canSeeWebsiteRequests =
    isAdmin || isPageAllowedForDepartment('/feather/website-requests', departmentId);
  useEffect(() => {
    if (!canSeeWebsiteRequests) return;
    let cancelled = false;
    const load = () => {
      fetch('/api/website-requests/unread-count', { cache: 'no-store', credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((json: { total?: number } | null) => {
          if (cancelled || !json) return;
          setNavBadges((prev) => ({ ...prev, '/feather/website-requests': json.total ?? 0 }));
        })
        .catch(() => { /* non-fatal */ });
    };
    load();
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    const iv = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(iv);
    };
  }, [canSeeWebsiteRequests]);

  // Chat unread red dot — polls /api/chat/unread for the global
  // room and stores the count under '/feather/chat'. The nav row's
  // existing badge renderer picks it up automatically. Cleared
  // by the chat page on mount via /api/chat/unread POST.
  // Chat is strictly alumni-only, so only alumni poll the unread badge —
  // everyone else (super admins included) would just 403.
  const canSeeChat = isAlumni;
  useEffect(() => {
    if (!canSeeChat) return;
    let cancelled = false;
    const load = () => {
      fetch('/api/chat/unread?all=1', { cache: 'no-store', credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((json: { unread?: number } | null) => {
          if (cancelled || !json) return;
          setNavBadges((prev) => ({ ...prev, '/feather/chat': json.unread ?? 0 }));
        })
        .catch(() => { /* non-fatal */ });
    };
    load();
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    const iv = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(iv);
    };
  }, [canSeeChat]);

  // Sidebar/popup links are gated on three layers, in this order:
  //   1. Per-user override (set by a super admin via /app/user-permissions
  //      → user_page_permissions). Allow / Block beats everything else.
  //   2. Admin-only flag — non-admins can't see admin pages.
  //   3. Department allow-list — admins bypass; everyone else needs
  //      their dept on the page's allowed list (empty = unrestricted).
  const canSeePage = (item: { path: string; adminOnly: boolean; alumniOnly?: boolean }) => {
    const override = userOverrides[item.path];
    if (override === false) return false;
    if (override === true) return true;
    // Chat is a private alumni-to-alumni space with NO super-admin
    // exception — strictly alumni, so even super admins don't see the
    // link. Checked before the generic alumniOnly rule below (which
    // would otherwise let super admins in).
    if (item.path === '/feather/chat') return isAlumni;
    // Alumni-only pages: alumni see them by membership, AND super
    // admins see them too so they can administer + spot-check the
    // alumni portal without switching accounts. Regular staff +
    // department admins are still gated out — that's the privacy
    // boundary the alumni rely on. (Was: `return isAlumni;`.)
    if (item.alumniOnly) return isAlumni || isSuperAdmin;
    // Cross-portal pages — visible to BOTH staff and alumni.
    // Arcade, Chat (peer + staff community surfaces) live
    // here. Add a path to this set when a feature is explicitly
    // shared across the two portals; default behavior below
    // still hides everything else from alumni.
    const CROSS_PORTAL_PATHS = new Set<string>(['/feather/arcade', '/feather/chat']);
    if (CROSS_PORTAL_PATHS.has(item.path)) {
      if (item.adminOnly && !isAdmin) return false;
      return true;
    }
    // Some admin-managed pages also live on the alumni side as a
    // peer directory (currently just /app/alumni-roster). Alumni
    // see them; the API privacy filter handles per-row opt-ins.
    if (isAlumni && ALUMNI_VIEWABLE_PATHS.has(item.path)) return true;
    // Alumni only see pages explicitly marked alumni-only (handled
    // above) or in the cross-portal allowlist. Everything else
    // in /app is staff-facing.
    if (isAlumni) return false;
    // Alumni Admins get sidebar visibility on the canonical alumni-
    // administration surfaces (Incoming Users, User Permissions,
    // Alumni roster) even when is_admin is false. Same list the
    // route-level PageGuard honors so navigation matches what the
    // sidebar shows.
    const alumniAdminPass = isAlumniAdmin && ALUMNI_ADMIN_PATHS.has(item.path);
    if (item.adminOnly && !isAdmin && !alumniAdminPass) return false;
    if (isAdmin || alumniAdminPass) return true;
    // Effective dept set = primary department_id + any extras a super
    // admin granted via /app/user-permissions → Departments tab.
    return isPageAllowedForDepartmentSet(item.path, [departmentId, ...userExtraDepartmentIds]);
  };
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Dismiss the desktop user menu on outside-click, Escape, or
  // route change. The popup used to require a second click on the
  // chevron to close, which felt broken — clicking anywhere else
  // on the page (including the page content under the popup) now
  // closes it.
  useEffect(() => {
    if (!userMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    const onPointerDown = (e: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    // mousedown (not click) so the popup closes the moment the press
    // starts — feels snappier than waiting for the up event.
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [userMenuOpen]);

  // Close the popup whenever the route changes — clicking a link
  // inside the popup already calls setUserMenuOpen(false), but a
  // global pathname-watch handles edge cases (back button, links
  // that don't manually close, etc).
  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // The user-account block at the bottom of the mobile drawer
  // (popup-only pages + My Profile + Sign Out) is collapsed by
  // default — tapping the user card row expands it. Reset whenever
  // the drawer closes so it's collapsed next time.
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  useEffect(() => {
    if (!mobileMenuOpen) setMobileAccountOpen(false);
  }, [mobileMenuOpen]);
  const [navMounted, setNavMounted] = useState(false);
  // Sidebar search query — filters the visible nav entries by label
  // / path substring. Only shown while the rail is expanded; clears
  // on Escape and on every route change so the next visit starts
  // clean.
  const [navSearch, setNavSearch] = useState('');
  // Phase 1 of the sidebar travel-and-landing animation: a FLIP
  // position tracker. Each rendered nav row calls flip.register
  // with its DOM element; the hook measures positions after every
  // commit and stashes per-row vertical deltas for the animation
  // phases that follow.
  const flip = useSidebarFlip();
  const [latestSignedJd, setLatestSignedJd] = useState<{ id: string; title: string } | null>(null);

  // Load departments for sidebar grouping. Hidden departments are
  // filtered out client-side so the admin toggle in /app/pages flips
  // visibility instantly. Ordering prefers admin-set display_order
  // (from the same page) and falls back to alphabetical name.
  useEffect(() => {
    if (!session?.access_token) return;
    async function loadDepts() {
      try {
        const data = await db({ action: 'select', table: 'departments', select: 'id, name, color, display_order, hidden' });
        if (Array.isArray(data)) {
          const rows = (data as NavDepartment[])
            .filter((d) => !d.hidden)
            .sort((a, b) => {
              const ao = a.display_order;
              const bo = b.display_order;
              const hasA = typeof ao === 'number';
              const hasB = typeof bo === 'number';
              if (hasA && hasB && ao !== bo) return (ao as number) - (bo as number);
              if (hasA !== hasB) return hasA ? -1 : 1;
              return (a.name || '').localeCompare(b.name || '');
            });
          setNavDepartments(rows);
        }
      } catch { /* ignore */ }
    }
    loadDepts();
  }, [session]);

  // Latest signed JD — shown under user name in sidebar chip
  useEffect(() => {
    if (!session?.access_token || !user?.id) return;
    let cancelled = false;
    async function loadLatestSigned() {
      try {
        const sigs = await db({
          action: 'select',
          table: 'jd_signatures',
          match: { signer_user_id: user!.id },
          select: 'id, job_description_id, signed_at',
          order: { column: 'signed_at', ascending: false },
        });
        if (cancelled || !Array.isArray(sigs)) return;
        const signed = (sigs as Array<{ job_description_id: string; signed_at: string | null }>).find((s) => !!s.signed_at);
        if (!signed) {
          setLatestSignedJd(null);
          return;
        }
        const jd = await db({
          action: 'select',
          table: 'job_descriptions',
          match: { id: signed.job_description_id },
          select: 'id, title',
        });
        if (cancelled) return;
        if (Array.isArray(jd) && jd.length > 0) {
          const row = jd[0] as { id: string; title: string };
          setLatestSignedJd({ id: row.id, title: row.title });
        }
      } catch { /* ignore */ }
    }
    loadLatestSigned();
    return () => { cancelled = true; };
  }, [session, user?.id]);

  // Group visible nav pages. Hierarchy, highest priority first:
  //   1. `navGroup` — a purely code-side label like "Media" so product
  //      areas can share a header without needing a fake department.
  //   2. `departmentId` — existing dept-based grouping from the DB.
  //   3. Ungrouped bucket at the very top of the sidebar.
  const visibleNavPages = navPages.filter(canSeePage);

  // RECENCY_VISIBLE_COUNT caps the top of the nav. Anything past
  // this falls into the "Other pages" dropdown. Sized to 7 because
  // that's the size most reps eyeball-scan without paging — same
  // intuition as why phone numbers are 7 digits.
  //
  // The earlier "alpha mode" gate (sidebar_click_count <
  // ALPHA_THRESHOLD → flat alpha list with no Other Pages) was
  // removed so the overflow disclosure is reachable by every user
  // from their first session, not only those who've crossed a
  // lifetime click threshold. New users with no click history
  // still see a sensible top N because the leftover-padding falls
  // back to alphabetical order.
  const RECENCY_VISIBLE_COUNT = 7;
  // Both modes use a single recency stack: every page the user has
  // clicked, newest first, with never-clicked pages tail-padded in
  // alpha order. Clicking a page promotes it to position 1 and the
  // page that was previously #1 slides to #2, the prior #2 to #3,
  // etc. — the nav reads as "recently viewed". Alpha mode renders
  // the whole stack; recency mode (once they cross
  // ALPHA_THRESHOLD clicks) caps the visible portion to the top
  // RECENCY_VISIBLE_COUNT and tucks the rest into Other pages.
  const recencyOrderedPages = useMemo(() => {
    // Home is permanently pinned to position 1 and excluded from
    // recency reordering. Visiting Home still bumps its
    // sidebar_recent_paths rank server-side (so it acts like a
    // normal click for the click counter / Other-pages threshold),
    // but visually it never leaves the top — the rest of the stack
    // fills positions 2..N below it.
    //
    // Alumni override: their home is /app/alumni (not /app), and
    // My Profile is permanently pinned to position 2 — alumni were
    // having to drill into the avatar popup to edit identity, which
    // for the alumni audience (less app-fluent than staff) hid the
    // single most important page in the portal. Pinning both lets
    // recency-reordering still run for positions 3..N.
    const HOME_PATH = isAlumni ? '/feather/alumni' : '/feather';
    // Alumni have their own dedicated profile editor at
    // /app/alumni/profile (sobriety date, opt-ins, etc.). Staff
    // keep using /app/profile.
    const PROFILE_PATH = isAlumni ? '/feather/alumni/profile' : '/feather/profile';
    const homePage = visibleNavPages.find((p) => p.path === HOME_PATH);
    // /app/profile lives in the popup section by default; for
    // alumni we synthesise a nav-shaped entry so it can sit at
    // position 2 without rewriting the PagePermissions seed.
    const profilePage = isAlumni
      ? (visibleNavPages.find((p) => p.path === PROFILE_PATH)
          ?? popupPages.find((p) => p.path === PROFILE_PATH)
          ?? null)
      : null;
    const pinned = new Set<string>([HOME_PATH, ...(isAlumni ? [PROFILE_PATH] : [])]);
    const nonPinnedVisible = visibleNavPages.filter((p) => !pinned.has(p.path));
    const byPath = new Map(nonPinnedVisible.map((p) => [p.path, p] as const));
    const ranked: typeof visibleNavPages = [];
    const seen = new Set<string>();
    for (const path of sidebarRecentPaths) {
      if (pinned.has(path)) continue;
      const hit = byPath.get(path);
      if (hit && !seen.has(path)) {
        ranked.push(hit);
        seen.add(path);
      }
    }
    const leftover = nonPinnedVisible
      .filter((p) => !seen.has(p.path))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    const tail = [...ranked, ...leftover];
    const head: typeof visibleNavPages = [];
    if (homePage) head.push(homePage);
    if (profilePage) head.push(profilePage);
    return [...head, ...tail];
  }, [visibleNavPages, popupPages, sidebarRecentPaths, isAlumni]);
  // Alumni see a flat sidebar — their portal is small enough
  // (~7 pages) that an Other-Pages disclosure adds confusion
  // without saving real space. Staff still get the top-N
  // + Other-Pages split for their larger surface.
  const recencyTopPages = isAlumni
    ? recencyOrderedPages
    : recencyOrderedPages.slice(0, RECENCY_VISIBLE_COUNT);

  // Apply the sidebar search query — when there's anything typed,
  // flatten the whole accessible-pages set to label/path matches
  // and short-circuit the recency/Other split so every hit is
  // visible at once. Empty query falls through to the normal
  // top-7 + Other-pages layout.
  const searchQuery = navSearch.trim().toLowerCase();
  // Search hits the nav stack first, then folds in any popup
  // pages the viewer can see (My Profile lives in popup) so a
  // super admin searching "My Profile" finds BOTH the staff
  // /app/profile and the alumni /app/alumni/profile sample —
  // labels are intentionally identical, the sample-preview
  // banner on the alumni page is what disambiguates them on
  // landing.
  const searchMatchedPages = searchQuery
    ? (() => {
        const navHits = recencyOrderedPages.filter((p) =>
          p.label.toLowerCase().includes(searchQuery)
          || p.path.toLowerCase().includes(searchQuery));
        const seen = new Set(navHits.map((p) => p.path));
        const popupHits = popupPages
          .filter(canSeePage)
          .filter((p) => !seen.has(p.path))
          .filter((p) =>
            p.label.toLowerCase().includes(searchQuery)
            || p.path.toLowerCase().includes(searchQuery));
        return [...navHits, ...popupHits];
      })()
    : null;
  // Spillover. Anything past the top-7 lives in the collapsible
  // "Other pages" section. Still ordered by recency (most-recent
  // first) so a page that just dropped out of the top-7 sits at the
  // top of Other, matching the brief: "When a page goes to spot 8,
  // put it in the top of other pages." Alumni get no spillover —
  // their whole nav is flat (see recencyTopPages above).
  const recencyOtherPages = isAlumni
    ? ([] as typeof recencyOrderedPages)
    : recencyOrderedPages.slice(RECENCY_VISIBLE_COUNT);
  // Track the disclosure state for the Other pages section. Per-user
  // persistence is overkill — a tab reload is cheap, and forgetting
  // the collapsed state after each session matches how reps actually
  // work the sidebar (open it when they need it, otherwise leave it).
  const [otherPagesOpen, setOtherPagesOpen] = useState(false);
  // Phase 9 — spillover animation. We can't observe the actual
  // "page X just bumped to position 8" moment server-side (the API
  // round-trip is fire-and-forget and the list mutates in one local
  // setState), but we *can* react to a click happening while we're
  // in recency mode AND Other has entries. When that combination
  // is observed, we briefly pulse the Other-pages header so the
  // user gets a visual cue that "something just landed in here".
  // 1200ms is long enough to read, short enough to not feel sticky.
  const [otherPagesFlash, setOtherPagesFlash] = useState(false);
  const lastClickCountRef = useRef(sidebarClickCount);
  useEffect(() => {
    if (sidebarClickCount > lastClickCountRef.current && recencyOtherPages.length > 0) {
      // Respect prefers-reduced-motion — skip the flash entirely so
      // users who've opted out of non-essential motion don't get a
      // pulsing background every time they click a nav entry.
      const prefersReducedMotion = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        setOtherPagesFlash(true);
        const t = window.setTimeout(() => setOtherPagesFlash(false), 1200);
        lastClickCountRef.current = sidebarClickCount;
        return () => window.clearTimeout(t);
      }
    }
    lastClickCountRef.current = sidebarClickCount;
  }, [sidebarClickCount, recencyOtherPages.length]);

  // Department / navGroup grouping is no longer rendered (Phase 5
  // of the sidebar overhaul). PageConfig.departmentId still drives
  // access control through canSeePage; we just don't visualise the
  // grouping anymore. The navDepartments state + fetch is left in
  // place because canSeePage chains into isPageAllowedForDepartment
  // via the PagePermissions provider, which expects the department
  // list to be loadable for permission editing.

  // Theme toggle removed — make sure no leftover localStorage value
  // re-applies the dark class after navigation, so the platform stays
  // on the single light palette regardless of prior visits.
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try { localStorage.removeItem('theme'); } catch {}
    // Trigger nav entrance animation after first paint
    requestAnimationFrame(() => setNavMounted(true));
  }, []);

  // Preload the Finance page so it renders instantly when the user
  // opens it. Two layers of warming:
  //   1. `router.prefetch` asks Next to fetch the Finance route bundle
  //      and its RSC payload in the background.
  //   2. We fire a no-await GET for the QuickBooks company list so
  //      the HTTP response is already sitting in the browser cache
  //      (credentials + same URL) by the time FinanceContent mounts
  //      and asks for it. The Finance sub-panels fetch their own
  //      reports lazily per tab; this covers the initial company
  //      picker + Overview handshake that used to show a spinner.
  // Skipped when there is no session yet (the API will 401), when
  // the user can't see Finance anyway (adminOnly page — warming a
  // 403 for every staff member just burned a lambda + an Intuit API
  // round trip per person), and after the first run this session.
  // The effect used to list `pathname` as a dep, which re-fired the
  // whole warm-up — including the server-side QuickBooks call — on
  // EVERY route change for EVERY user. Once per session is enough:
  // the prefetch + browser-cached list don't go stale in minutes,
  // and Finance's own fetches take over once the page mounts.
  const financeWarmedRef = useRef(false);
  useEffect(() => {
    if (!session?.access_token) return;
    if (!isAdmin) return;
    if (financeWarmedRef.current) return;
    if (pathname?.startsWith('/feather/finance')) return;
    financeWarmedRef.current = true;
    try { router.prefetch('/feather/finance'); } catch { /* noop */ }
    const controller = new AbortController();
    const warm = window.requestIdleCallback
      ? window.requestIdleCallback(() => {
          fetch('/api/quickbooks/data?report=list', {
            credentials: 'include',
            signal: controller.signal,
          }).catch(() => { /* ignore — this is opportunistic */ });
        })
      : window.setTimeout(() => {
          fetch('/api/quickbooks/data?report=list', {
            credentials: 'include',
            signal: controller.signal,
          }).catch(() => { /* ignore */ });
        }, 400);
    return () => {
      controller.abort();
      if (typeof warm === 'number') window.clearTimeout(warm);
      else if (window.cancelIdleCallback) window.cancelIdleCallback(warm);
    };
    // pathname intentionally omitted: it only matters for the skip-
    // when-already-there check on the FIRST run, and including it
    // re-fired the warm-up on every navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, isAdmin, router]);

  // Close drawer on Escape + lock body scroll while open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  // Auto-close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // While the user is on the "Waiting for approval" hold screen, poll
  // their profile every 5s so an admin's Approve click unblocks them
  // without requiring a manual sign-out / refresh. Stops as soon as
  // status flips to active.
  useEffect(() => {
    if (status !== 'on_hold' && status !== 'denied') return;
    if (!user?.id) return;
    const id = setInterval(() => {
      refreshProfile().catch(() => { /* network blip — try again next tick */ });
    }, 5000);
    return () => clearInterval(id);
  }, [status, user?.id, refreshProfile]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not signed in — show the cinematic login screen.
  if (!user) {
    return <LoginScreen onSignIn={signInWithGoogle} />;
  }

  // Signed in but awaiting approval — block app access until a super admin
  // approves the user from the Team page.
  if (status === 'on_hold' || status === 'denied') {
    const denied = status === 'denied';
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
        <HeroGallery />
        <div className="relative z-10 max-w-md w-full mx-4 text-center bg-white/95 backdrop-blur rounded-2xl border border-gray-100 shadow-2xl p-8">
          <img
            src="/images/logo.png"
            alt="Seven Arrows Recovery"
            className="h-16 w-auto mx-auto mb-5"
          />
          <h1 className="text-lg font-semibold text-foreground mb-2">
            {denied ? 'Access denied' : 'Waiting for approval'}
          </h1>
          <p className="text-sm text-foreground/60 mb-6" style={{ fontFamily: 'var(--font-body)' }}>
            {denied
              ? 'Your account was denied access. If you believe this was a mistake, please contact a Seven Arrows administrator.'
              : 'Your email isn\u2019t on the Seven Arrows domain, so an administrator needs to approve your account before you can continue.'}
          </p>
          <p className="text-xs text-foreground/40 mb-6" style={{ fontFamily: 'var(--font-body)' }}>
            Signed in as <span className="font-medium text-foreground/60">{user.email}</span>
          </p>
          <button
            onClick={signOut}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-foreground text-white hover:bg-foreground/90 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // Signed in — platform with sidebar
  return (
    <div className="flex min-h-screen app-shell relative">
      <FlowBackground />
      <PresenceCursors />
      <LeverPullListener />
      <ContactSubmissionToasts />
      {/* Global cmd+K / ctrl+K palette. Listens for the shortcut at
          window level so it's available from any /app/* surface. */}
      <CommandPalette />
      {/* Left Sidebar — collapsed-by-default rail that expands on
          hover. The aside reserves a narrow `w-16` column so the
          main content's layout never reflows; the inner panel is
          absolutely positioned and slides out to `w-64` over the
          page on group-hover, restoring labels + section headers
          via an opacity fade. Click-away or unhover collapses back. */}
      <aside data-sidebar-rail className={`group/sidebar ${railPinnedOpen ? 'w-64 rail-pinned' : 'w-16'} shrink-0 hidden lg:block relative z-30`}>
        {/* Sticky sized to the real viewport. The `100vh/0.82`
            divisor here was compensating for `.app-shell { zoom: 0.82 }`
            at lg+, but that transform was removed (see globals.css —
            "removing the transform so the platform renders at 100%
            on every breakpoint"). With no zoom, the divisor pushed
            the sticky wrapper to ~122vh, dropping the bottom-pinned
            user chip + popup menu below the visible viewport. Plain
            `h-screen` matches the real viewport again. */}
        <div className="sticky top-0 h-screen">
        {/* Inner glass panel — overlay layer that grows from w-16
            (collapsed) to w-64 (expanded) on hover. Glass treatment
            lives here now so the column-only collapsed state still
            shows the frosted background behind the icons. */}
        <div className="absolute inset-y-0 left-0 w-16 group-hover/sidebar:w-64 rail-open:w-64 transition-[width] duration-200 ease-out overflow-hidden bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur-2xl border-r border-white/60 flex flex-col shadow-[0_0_0_0_rgba(0,0,0,0)] group-hover/sidebar:shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)] rail-open:shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)]">
        {/* Glass treatment — semi-transparent white, heavy backdrop
            blur, an inner specular sheen line at the top and a
            subtle vertical gradient that fades down so the panel
            reads as a frosted-glass layer over the warm background. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-px"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(188,107,74,0.18) 30%, rgba(188,107,74,0.18) 70%, transparent 100%)' }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
        />
        <div className="flex flex-col h-full w-64">
        {/* Logo / Brand */}
        <div className="px-6 py-5 border-b border-gray-100">
          <Link href="/feather" className={`flex items-center gap-2.5 transition-all duration-500 ease-out ${navMounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
            <SevenArrowsLogo />
            {/* Wordmark only renders once the rail expands. Same
                group-hover/sidebar gate the search bar + Other-pages
                section use, so the collapsed icon-rail stays clean. */}
            <span
              className="hidden group-hover/sidebar:inline rail-open:inline text-[15px] font-semibold tracking-tight text-foreground/85 lowercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              feather
            </span>
          </Link>
        </div>

        {/* Sidebar search — visible in BOTH the collapsed and the
            hover-expanded rail states so it's always reachable.
            In collapsed state (w-16) the input is replaced by a
            magnifier glyph chip that, when clicked, focuses the
            input the moment hover-expand kicks in. In expanded
            state (w-64) the full text input is shown. Previously
            this whole block was hidden until hover, so anyone who
            never realised the rail had hover-to-expand never knew
            search existed — that surfaced as 'pros can't see it'.
            Other Pages now also stays reachable from the same
            expanded state. */}
        {isChatMode ? (
          /* Chat mode — conversation rail replaces search + page nav.
             Suspense because ChatRail reads useSearchParams. */
          <Suspense fallback={null}>
            <ChatRail variant="rail" />
          </Suspense>
        ) : (
        <>
        <div className="px-3 pt-1 pb-2">
          {/* Collapsed: icon-only chip (sidebar w-16). Hover-expand
              hides this and shows the input below. */}
          <button
            type="button"
            onClick={() => { /* hover-expand-on-click for keyboard users */
              const el = document.getElementById('sidebar-search-input') as HTMLInputElement | null;
              el?.focus();
            }}
            aria-label="Search pages"
            title="Search pages"
            className="group-hover/sidebar:hidden rail-open:hidden w-full inline-flex items-center justify-center h-9 rounded-xl text-foreground/50 hover:text-primary hover:bg-warm-bg/60 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
            </svg>
          </button>
          {/* Expanded: full input. */}
          <label className="relative hidden group-hover/sidebar:block rail-open:block">
            <span aria-hidden className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/35">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
              </svg>
            </span>
            <input
              id="sidebar-search-input"
              type="search"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setNavSearch(''); }}
              placeholder="Search pages…"
              className="sa-liquid-glass w-full pl-8 pr-2.5 py-1.5 rounded-xl text-[13px] placeholder:text-foreground/40"
              style={{ fontFamily: 'var(--font-body)' }}
              aria-label="Search pages"
            />
          </label>
        </div>

        {/* Nav links — grouped by department.
            `min-h-0` is required so the flex child can actually shrink
            below its content's intrinsic height; without it the nav
            overflows the parent panel (which has `overflow-hidden`)
            and items at the bottom get clipped with no way to scroll
            to them. Most visible on Windows + 125%/150% display
            scaling, where the viewport height the sticky parent gets
            ends up shorter than the nav's natural content height. */}
        <nav className="sa-sidebar-scroll flex-1 min-h-0 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {(() => {
            let animIdx = 0;
            const renderLink = (item: PageConfig) => {
              const idx = animIdx++;
              // Active route logic — exact match OR `pathname is a
              // sub-route of item.path`. Catches /app/admissions/leads/123
              // for an item.path of /app/admissions so deep links still
              // light up the parent nav row. Excludes the bare "/feather"
              // dashboard from matching every /app/* (otherwise Home would
              // be permanently "active") by requiring the +'/' suffix.
              const isActive = item.path === pathname
                || (item.path !== '/feather' && pathname?.startsWith(item.path + '/'));
              // External-URL entries (e.g. "Website" → marketing
              // site) render as a target="_blank" anchor instead of
              // a Next Link. The recency visit still fires so they
              // participate in reordering like internal pages.
              // Active treatment: 3px copper left border via the
              // ::before pseudo-element on the parent (border on the
              // pill itself would clash with the rounded-xl shape),
              // font-semibold lift, and a subtle warm-sand background
              // pulled from the same primary tint used elsewhere in
              // the sidebar so the active state reads in lockstep
              // with the brand.
              const commonClassName = `group/nav relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm overflow-hidden transition-all duration-500 ease-out motion-reduce:transition-none hover:shadow-[0_4px_14px_-6px_rgba(188,107,74,0.35)] ${
                isActive
                  ? 'font-semibold bg-warm-bg/70 text-primary shadow-[inset_3px_0_0_0_var(--color-primary),inset_0_0_0_1px_rgba(188,107,74,0.18)]'
                  : 'font-medium text-foreground/60 hover:text-foreground'
              } ${navMounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}`;
              const commonStyle = { fontFamily: 'var(--font-body)', transitionDelay: `${idx * 50}ms` } as const;
              // Use ARIA's exact spec: aria-current='page' when active,
              // attribute fully omitted when not. Don't pass aria-current
              // ='false' — screen readers treat that the same as 'page'
              // on some platforms.
              const ariaCurrent: 'page' | undefined = isActive ? 'page' : undefined;
              if (item.externalUrl) {
                return (
                  <a
                    key={item.path}
                    ref={(el) => flip.register(item.path, el)}
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => { flip.markTraveler(item.path); recordSidebarVisit(item.path); }}
                    className={commonClassName}
                    style={commonStyle}
                    aria-current={ariaCurrent}
                  >
                    {/* External-link svg slipped in next to the icon
                        so the label still aligns with internal rows. */}
                    <span className="text-foreground/40">
                      {getPageIcon(item.path)}
                    </span>
                    <span className="flex-1 whitespace-nowrap transition-[opacity,transform] duration-200 ease-out opacity-0 group-hover/sidebar:opacity-100 rail-open:opacity-100 group-hover/nav:translate-x-0.5">{item.label}</span>
                    <svg className="w-3 h-3 text-foreground/35 opacity-0 group-hover/sidebar:opacity-100 rail-open:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 3h7v7" />
                      <path d="M21 3l-9 9" />
                      <path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5" />
                    </svg>
                  </a>
                );
              }
              return (
                <Link
                  key={item.path}
                  ref={(el) => flip.register(item.path, el)}
                  href={item.path}
                  onClick={(e) => {
                    // Tag the traveler so the FLIP hook can paint
                    // a spotlight on it during its upcoming travel
                    // (sidebar-flip Phase 5). Has to fire BEFORE
                    // recordSidebarVisit because the state update
                    // there schedules the re-render that the FLIP
                    // hook reads markTraveler from.
                    flip.markTraveler(item.path);
                    // Record the click for the sidebar recency model
                    // (Phase 3). Fires regardless of whether the route
                    // actually changes — a re-click on the current page
                    // still expresses preference.
                    recordSidebarVisit(item.path);
                    // If we're already on this pathname but with a query
                    // string (e.g. /app/calls?tab=operators), Next.js's
                    // default Link behavior can skip the navigation and
                    // leave stale tab state behind. Force a clean replace
                    // to the bare path so URL-derived state (tabs, etc.)
                    // resets to the default.
                    if (pathname === item.path) {
                      e.preventDefault();
                      router.replace(item.path, { scroll: false });
                    }
                  }}
                  className={commonClassName}
                  style={commonStyle}
                  aria-current={ariaCurrent}
                >
                  {/* Phase 2: sliding pill background — primary-tinted
                      gradient that grows from the left edge on hover.
                      Sits underneath the link content via -z-10 +
                      pointer-events-none so clicks pass through. The
                      pill width is animated via scale-x with a left
                      origin so it reads as 'sliding in from the
                      handle' rather than a fade. Active links skip
                      this — they already have their own primary tint. */}
                  {!isActive && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -z-10 rounded-xl origin-left scale-x-0 group-hover/nav:scale-x-100 transition-transform duration-300 ease-out"
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(188,107,74,0.16) 0%, rgba(188,107,74,0.06) 65%, transparent 100%)',
                      }}
                    />
                  )}
                  {/* Phase 3: left-edge accent bar — 3px stripe in the
                      brand color that scales up vertically on hover.
                      Pinned to the left inset so the bar reads as a
                      'tab marker' nodding to the active state. */}
                  {!isActive && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-primary scale-y-0 group-hover/nav:scale-y-100 origin-center transition-transform duration-300 ease-out"
                    />
                  )}
                  {/* Phase 4 + 8: icon shifts up + scales on hover, with
                      a soft brand-color glow filter that fades in.
                      Active state keeps its primary color statically. */}
                  <span
                    className={`relative transition-all duration-300 ease-out ${
                      isActive
                        ? 'text-primary'
                        : 'text-foreground/40 group-hover/nav:text-primary group-hover/nav:scale-110 group-hover/nav:-translate-y-px'
                    }`}
                    style={{
                      filter: isActive
                        ? undefined
                        : undefined,
                    }}
                  >
                    {getPageIcon(item.path)}
                    {/* Unread dot — pinned to the icon so it reads even
                        while the rail is collapsed to icons-only (the
                        count chip below only shows on hover-expand). */}
                    {(navBadges[item.path] ?? 0) > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-2 ring-white animate-pulse"
                      />
                    )}
                  </span>
                  {/* Phase 5: text translateX nudge — 2px right shift
                      so the label "leans into" the cursor on hover.
                      whitespace-nowrap + opacity fade so the label
                      doesn't wrap or peek out while the rail is in
                      its collapsed (icon-only) state. */}
                  <span className="flex-1 whitespace-nowrap transition-[opacity,transform] duration-200 ease-out opacity-0 group-hover/sidebar:opacity-100 rail-open:opacity-100 group-hover/nav:translate-x-0.5">{item.label}</span>
                  {/* Super-admin-only badge — a small mask icon
                      that surfaces when item.superAdminOnly is set
                      (Mercury, Social Media, Kaizen, Levers, HIPAA).
                      title attribute drives the native tooltip on
                      hover so the rail stays uncluttered. Visible to
                      everyone on the page since adminOnly already
                      keeps the row out of non-admin sidebars. */}
                  {item.superAdminOnly && (
                    <span
                      aria-label="Only for super admins"
                      className="relative ml-1 inline-flex items-center text-amber-600 opacity-0 group-hover/sidebar:opacity-100 rail-open:opacity-100 transition-opacity duration-200 group/sa"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 11c0-1 1-2 2-2h14c1 0 2 1 2 2v1c0 1-1 2-2 2h-3.2c-.4 1.6-1.9 2.7-3.8 2.7s-3.4-1.1-3.8-2.7H5c-1 0-2-1-2-2v-1z" />
                        <circle cx="8.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
                        <circle cx="15.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
                      </svg>
                      {/* Instant tooltip — no native title delay.
                          Sits above the icon, right-anchored so it
                          doesn't get clipped on narrow rails. */}
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded-md bg-foreground/95 text-white text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-1 shadow-lg opacity-0 group-hover/sa:opacity-100 transition-opacity duration-100 z-50"
                      >
                        Only for super admins
                      </span>
                    </span>
                  )}
                  {/* Super-admin-only "ALUMNI" tag · added so a
                      super admin scanning their sidebar can tell at
                      a glance which rows are alumni-portal pages
                      they're auditing vs their own staff surfaces.
                      Alumni themselves don't see this — every page
                      visible to them IS an alumni page, so the
                      label would be noise. Regular staff also
                      don't see it because they don't see alumni-only
                      pages at all. */}
                  {/* Cross-portal paths (Chat, Arcade) are ALWAYS
                      'Alumni' even if a stale DB row toggled them
                      alumni_only=true — they're shared with staff
                      by definition, so 'Alumni only' would be
                      misleading. Pure alumni-only pages still get
                      the louder 'Alumni only' chip. */}
                  {(() => {
                    const crossPortal = item.path === '/feather/chat' || item.path === '/feather/arcade';
                    const showChip = isSuperAdmin && !isAlumni && (item.alumniOnly || crossPortal);
                    if (!showChip) return null;
                    const labelOnly = item.alumniOnly && !crossPortal;
                    return (
                      <span
                        aria-label={labelOnly ? 'alumni-only page' : 'alumni page'}
                        className={`inline-flex items-center px-1 py-0.5 rounded text-[7.5px] font-bold uppercase tracking-[0.08em] whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 rail-open:opacity-100 transition-opacity duration-200 ${
                          labelOnly
                            ? 'bg-violet-500/15 text-violet-700 border border-violet-500/30'
                            : 'bg-violet-500/8 text-violet-700/80 border border-violet-500/15'
                        }`}
                      >
                        {labelOnly ? 'Alumni only' : 'Alumni'}
                      </span>
                    );
                  })()}
                  {(navBadges[item.path] ?? 0) > 0 && (
                    <span
                      aria-label={`${navBadges[item.path]} new`}
                      className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold tabular-nums whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 rail-open:opacity-100 transition-opacity duration-200"
                    >
                      {navBadges[item.path]! > 99 ? '99+' : navBadges[item.path]}
                    </span>
                  )}
                  {/* Phase 6: right-side chevron — fades + slides in
                      from -4px on hover so the row reads as
                      "click-through" without taking up a slot when
                      the cursor isn't there. Only on non-active rows
                      since the active state is already the
                      destination. */}
                  {!isActive && (
                    <svg
                      aria-hidden="true"
                      className="pointer-events-none w-3 h-3 text-primary opacity-0 -translate-x-1 group-hover/nav:opacity-90 group-hover/nav:translate-x-0 transition-all duration-300 ease-out"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </Link>
              );
            };
            // When the search box has anything typed, the nav
            // short-circuits to a flat result list. The top-7 /
            // Other-pages split only makes sense for the
            // unfiltered case; while searching we want every hit
            // visible regardless of recency rank.
            if (searchMatchedPages != null) {
              if (searchMatchedPages.length === 0) {
                return (
                  <p className="px-3 py-2 text-[12px] text-foreground/45 italic hidden group-hover/sidebar:block rail-open:block" style={{ fontFamily: 'var(--font-body)' }}>
                    No pages match &ldquo;{navSearch}&rdquo;
                  </p>
                );
              }
              return <>{searchMatchedPages.map(renderLink)}</>;
            }
            // Recency layout: top RECENCY_VISIBLE_COUNT pinned at
            // the top, the rest tucked under an "Other pages"
            // collapsible. Earlier this was gated behind an
            // ALPHA_THRESHOLD click counter so new users got a
            // flat alpha list — that gate was removed so Other
            // Pages is reachable for every user from the first
            // session, not only those who've crossed the threshold.
            // Phase 7+: recency mode renders the top
            // RECENCY_VISIBLE_COUNT entries above an "Other pages"
            // collapsible. The Marketing-team "Website" external
            // link, which used to hang off the dept group, now
            // renders unconditionally at the bottom of the nav
            // outside this switch — see the <a> below the </nav>.
            return (
              <>
                {recencyTopPages.map(renderLink)}
                {recencyOtherPages.length > 0 && (
                  // The rail is icon-only at rest; the Other-pages
                  // section is text-first (label + chevron, plus
                  // the items underneath which would otherwise
                  // bleed icons into the w-16 gutter). Render the
                  // whole subtree only when the rail is hovered
                  // out to w-64 — `hidden group-hover/sidebar:block`
                  // is more reliable than opacity+max-h here
                  // because Tailwind's `hidden` class triggers
                  // display:none, which hard-blocks layout for the
                  // icon stack entirely.
                  <div className="mt-2 pt-2 border-t border-foreground/10 hidden group-hover/sidebar:block rail-open:block">
                    <button
                      type="button"
                      onClick={() => setOtherPagesOpen((v) => !v)}
                      aria-expanded={otherPagesOpen}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold uppercase tracking-[0.12em] text-foreground/45 hover:bg-warm-bg/60 transition-colors ${otherPagesFlash ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <span>Other pages</span>
                      <span aria-hidden className={`transition-transform duration-200 ${otherPagesOpen ? 'rotate-180' : ''}`}>▾</span>
                    </button>
                    {otherPagesOpen && (
                      <div className="mt-0.5">{recencyOtherPages.map(renderLink)}</div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </nav>
        </>
        )}

        {/* User settings — bottom left */}
        <div ref={userMenuRef} className="relative p-3 border-t border-gray-100">
          {userMenuOpen && (
            <div
              role="menu"
              aria-label="Account menu"
              className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-y-auto z-50 max-h-[calc(100vh-120px)] py-1"
            >
              {/* 'My Profile' is reachable from the avatar click +
                  sidebar pin; keeping it in the popup duplicated
                  the same destination users already had two
                  obvious ways to reach. */}
              {popupPages.filter(canSeePage).filter((p) => p.path !== '/feather/profile' && p.path !== '/feather/alumni/profile').map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => { flip.markTraveler(item.path); recordSidebarVisit(item.path); setUserMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-foreground/70 hover:bg-warm-bg transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {getPageIcon(item.path, 'sm')}
                  {item.label}
                </Link>
              ))}
              <ShowCursorsToggle />
              <button
                onClick={() => { signOut(); setUserMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
          {/* Avatar → My Profile (primary). Name + chevron still toggles
              the popup menu (admin pages, sign out)
              so the power-user affordance is preserved. */}
          <div className="w-full flex items-stretch gap-3 px-3 py-2.5 rounded-xl hover:bg-warm-bg transition-colors">
            <Link
              href="/feather/profile"
              aria-label="My Profile"
              className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="My Profile"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                  {(user.user_metadata?.full_name || user.email || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex-1 min-w-0 flex items-center gap-3 text-left opacity-0 group-hover/sidebar:opacity-100 rail-open:opacity-100 transition-opacity duration-200"
              aria-label="Account menu"
              aria-expanded={userMenuOpen}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.user_metadata?.full_name || 'User'}
                </p>
                {latestSignedJd ? (
                  <p className="text-xs text-foreground/50 truncate" title={`Signed: ${latestSignedJd.title}`}>
                    {latestSignedJd.title}
                  </p>
                ) : (
                  <p className="text-xs text-foreground/40 truncate">{user.email}</p>
                )}
              </div>
              <svg className="w-4 h-4 text-foreground/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </button>
          </div>
        </div>
        </div> {/* end inner column (w-64) */}
        </div> {/* end overlay panel */}
        </div> {/* end sticky wrapper */}
      </aside>

      {/* Main content area. The inner overflow-auto is only needed on
          lg+ where the sidebar is sticky and the main panel must
          scroll independently to keep the rail visible. On mobile the
          rail is hidden, so letting the body scroll naturally avoids
          the double-scrollbar (page + main panel) iOS shows when this
          element is taller than the viewport. */}
      <div data-platform-main className="flex-1 min-w-0 lg:overflow-auto relative">
        {/* min-w-0 — flex items default to min-width:auto, which lets
            an inner element with a wide intrinsic content width
            (long paragraph, button row, table) push this panel past
            the viewport on mobile. The page then renders horizontally
            scrollable and iOS Safari hijacks pinch-to-zoom-out as a
            swipe-back, leaving the user "zoomed in" with no escape. */}
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white/90 backdrop-blur border-b border-gray-100">
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="p-2 -ml-2 rounded-lg text-foreground/70 hover:bg-warm-bg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/feather" aria-label="Seven Arrows Recovery" className="inline-flex items-center gap-2">
            <SevenArrowsLogo size="sm" />
            <span
              className="text-[14px] font-semibold tracking-tight text-foreground/85 lowercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              feather
            </span>
          </Link>
          <div className="w-10" aria-hidden="true" />
        </div>

        {/* Mobile drawer — z-[70] so it overlays the home orbit
            (which now sits at relative z-50 to keep its hover
            tooltips above the at-a-glance card below). */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[70]" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-drawer-fade"
              aria-hidden="true"
            />
            {/* Panel */}
            <aside className="absolute inset-y-0 left-0 w-[82%] max-w-[320px] bg-white border-r border-gray-100 shadow-2xl flex flex-col overflow-hidden animate-drawer-slide">
              {/* Header: brand (taps through to today's log surface) + close */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
                <Link
                  href="/feather/logs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5"
                  aria-label="Daily logs"
                  title="Daily logs"
                >
                  <SevenArrowsLogo />
                  <span
                    className="text-[15px] font-semibold tracking-tight text-foreground/85 lowercase"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    feather
                  </span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-2 -mr-2 rounded-lg text-foreground/60 hover:bg-warm-bg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Nav links — flat alphabetical list (Phase 4/5 of the
                  sidebar overhaul). Department / navGroup headers
                  were dropped in Phase 5; the page_permissions data
                  still owns dept membership for access control, the
                  nav just doesn't visualise it anymore.
                  `min-h-0` is the critical bit for mobile scroll: in
                  a flex column the default min-height is `auto`,
                  which lets this nav grow to fit its content and
                  disables the inner overflow-y-auto. min-h-0 lets it
                  shrink below content height so the inner scroll
                  engages. */}
              {/* Each link is wrapped in <li>. The Phase-1 mobile
                  tap-target rule in globals.css turns every <a> into
                  display:inline-flex (so icon-only buttons hit 44px),
                  but explicitly exempts anchors descended from <li>
                  (`:not(li a)`). Wrapping here is the cleanest way to
                  opt the drawer rows out without fighting specificity
                  on every callsite — they go back to natural display
                  and stack vertically inside the parent <ul>. */}
              {isChatMode ? (
                <Suspense fallback={null}>
                  <ChatRail variant="drawer" onNavigate={() => setMobileMenuOpen(false)} />
                </Suspense>
              ) : (
              <ul className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 space-y-0.5">
                {(() => {
                  const renderMobileLink = (item: PageConfig) => {
                    const isActive = pathname === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          href={item.path}
                          onClick={() => { flip.markTraveler(item.path); recordSidebarVisit(item.path); setMobileMenuOpen(false); }}
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground/70 hover:bg-warm-bg hover:text-foreground'
                          }`}
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          <span className={isActive ? 'text-primary' : 'text-foreground/40'}>
                            {getPageIcon(item.path)}
                          </span>
                          <span className="flex-1">{item.label}</span>
                          {item.superAdminOnly && (
                            <span
                              aria-label="Only for super admins"
                              className="relative inline-flex items-center text-amber-600 group/sa"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M3 11c0-1 1-2 2-2h14c1 0 2 1 2 2v1c0 1-1 2-2 2h-3.2c-.4 1.6-1.9 2.7-3.8 2.7s-3.4-1.1-3.8-2.7H5c-1 0-2-1-2-2v-1z" />
                                <circle cx="8.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
                                <circle cx="15.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
                              </svg>
                              <span
                                role="tooltip"
                                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded-md bg-foreground/95 text-white text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-1 shadow-lg opacity-0 group-hover/sa:opacity-100 transition-opacity duration-100 z-50"
                              >
                                Only for super admins
                              </span>
                            </span>
                          )}
                          {(navBadges[item.path] ?? 0) > 0 && (
                            <span
                              aria-label={`${navBadges[item.path]} new`}
                              className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold tabular-nums"
                            >
                              {navBadges[item.path]! > 99 ? '99+' : navBadges[item.path]}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  };
                  return (
                    <>
                      {recencyTopPages.map(renderMobileLink)}
                      {recencyOtherPages.length > 0 && (
                        <li className="mt-2 pt-2 border-t border-foreground/10 list-none">
                          <button
                            type="button"
                            onClick={() => setOtherPagesOpen((v) => !v)}
                            aria-expanded={otherPagesOpen}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold uppercase tracking-[0.12em] text-foreground/45 hover:bg-warm-bg/60 ${otherPagesFlash ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            <span>Other pages</span>
                            <span aria-hidden className={`transition-transform duration-200 ${otherPagesOpen ? 'rotate-180' : ''}`}>▾</span>
                          </button>
                          {otherPagesOpen && <ul className="mt-0.5 space-y-0.5">{recencyOtherPages.map(renderMobileLink)}</ul>}
                        </li>
                      )}
                    </>
                  );
                })()}
              </ul>
              )}

              {/* Account section — collapsed by default. Tapping the
                  user card at the bottom toggles it. Keeps the drawer
                  short and on-task; My Profile / Sign Out / admin
                  popup pages live one tap deeper. */}
              {mobileAccountOpen && (
                <>
                  {popupPages.filter(canSeePage).filter((p) => p.path !== '/feather/profile' && p.path !== '/feather/alumni/profile').length > 0 && (
                    <ul className="p-3 border-t border-gray-100 space-y-0.5 max-h-[30vh] overflow-y-auto shrink-0">
                      {popupPages.filter(canSeePage).filter((p) => p.path !== '/feather/profile' && p.path !== '/feather/alumni/profile').map((item) => {
                        const isActive = pathname === item.path;
                        return (
                          <li key={item.path}>
                            <Link
                              href={item.path}
                              onClick={() => { flip.markTraveler(item.path); recordSidebarVisit(item.path); setMobileMenuOpen(false); }}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                isActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-foreground/70 hover:bg-warm-bg hover:text-foreground'
                              }`}
                              style={{ fontFamily: 'var(--font-body)' }}
                            >
                              <span className={isActive ? 'text-primary' : 'text-foreground/40'}>
                                {getPageIcon(item.path)}
                              </span>
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <ul className="p-3 border-t border-gray-100 space-y-0.5 shrink-0">
                    <li>
                    <Link
                      href="/feather/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        pathname === '/feather/profile'
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/70 hover:bg-warm-bg hover:text-foreground'
                      }`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <span className={pathname === '/feather/profile' ? 'text-primary' : 'text-foreground/40'}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </span>
                      My Profile
                    </Link>
                    </li>
                    <li>
                    <button
                      onClick={() => { setMobileMenuOpen(false); signOut(); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                      Sign Out
                    </button>
                    </li>
                  </ul>
                </>
              )}

              {/* User card — always visible. Tapping it expands /
                  collapses the account section above. */}
              <div className="p-3 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileAccountOpen((v) => !v)}
                  aria-expanded={mobileAccountOpen}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-warm-bg/60 transition-colors"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                      {(user.user_metadata?.full_name || user.email || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.user_metadata?.full_name || 'User'}
                    </p>
                    {latestSignedJd ? (
                      <p className="text-xs text-foreground/50 truncate" title={`Signed: ${latestSignedJd.title}`}>
                        {latestSignedJd.title}
                      </p>
                    ) : (
                      <p className="text-xs text-foreground/40 truncate">{user.email}</p>
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 text-foreground/45 shrink-0 transition-transform ${mobileAccountOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                </button>
              </div>
            </aside>
          </div>
        )}

        <PageGuard>{children}</PageGuard>

        {/* Same-page viewers — shown on every /app/* page */}
        <PageViewers />

      </div>
    </div>
  );
}

// Toggle row in the account popup menu. Lets each user opt in / out of
// seeing other people's live cursors moving across the page. Choice is
// localStorage-only — no per-user DB column — so it's instant and
// survives reloads without a round-trip. PresenceCursors reads the
// same key and listens for the 'show-cursors-change' CustomEvent so a
// toggle here updates the renderer in real time, no reload needed.
const SHOW_CURSORS_STORAGE_KEY = 'sa-show-other-cursors';
function ShowCursorsToggle() {
  const [on, setOn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(SHOW_CURSORS_STORAGE_KEY) !== 'off';
  });

  function toggle() {
    const next = !on;
    setOn(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SHOW_CURSORS_STORAGE_KEY, next ? 'on' : 'off');
      window.dispatchEvent(new CustomEvent('show-cursors-change', { detail: { on: next } }));
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      role="menuitemcheckbox"
      aria-checked={on}
      className="flex items-center justify-between w-full gap-2.5 px-4 py-3 text-sm text-foreground/70 hover:bg-warm-bg transition-colors"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l7.5 18 2.5-7 7-2.5L3 3z" />
        </svg>
        Other cursors
      </span>
      <span
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${on ? 'bg-primary' : 'bg-foreground/20'}`}
        aria-hidden
      >
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${on ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}
