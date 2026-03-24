
import { useState, useRef, useEffect } from 'react';
import { Link } from '@remix-run/react';

/* ── Animated SVG Icons ─────────────────────────────────────────────── */

function TeamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="3">
        <animate attributeName="r" values="3;3.3;3" dur="2s" repeatCount="indefinite" />
      </circle>
      <path d="M5 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
      <circle cx="5" cy="9" r="2" opacity="0.5" />
      <circle cx="19" cy="9" r="2" opacity="0.5" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2">
        <animateTransform attributeName="transform" type="rotate" values="0 12 12;3 12 12;0 12 12;-3 12 12;0 12 12" keyTimes="0;0.25;0.5;0.75;1" dur="1.5s" repeatCount="indefinite" />
      </polygon>
    </svg>
  );
}

function PhilosophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2.5s" repeatCount="indefinite" />
      </path>
      <path d="M2 12l10 5 10-5">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3">
        <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
      </path>
      <line x1="12" y1="17" x2="12.01" y2="17">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

function BlogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Open magazine */}
      <rect x="2" y="4" width="20" height="16" rx="2">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="2.5s" repeatCount="indefinite" />
      </rect>
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="5" y1="8" x2="10" y2="8" opacity="0.6" />
      <line x1="5" y1="11" x2="10" y2="11" opacity="0.4" />
      <line x1="5" y1="14" x2="9" y2="14" opacity="0.3" />
      <line x1="14" y1="8" x2="19" y2="8" opacity="0.6" />
      <line x1="14" y1="11" x2="19" y2="11" opacity="0.4" />
    </svg>
  );
}

function CareersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3">
        <animate attributeName="r" values="3;3.5;3" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </polyline>
    </svg>
  );
}

function DetoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v6l3 3" />
      <circle cx="12" cy="14" r="8">
        <animate attributeName="r" values="8;8.3;8" dur="2s" repeatCount="indefinite" />
      </circle>
      <path d="M8 14s1.5 2 4 2 4-2 4-2">
        <animate attributeName="d" values="M8 14s1.5 2 4 2 4-2 4-2;M8 15s1.5 1 4 1 4-1 4-1;M8 14s1.5 2 4 2 4-2 4-2" dur="2s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function InterventionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="1.2s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function AlumniIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12">
        <animate attributeName="stroke-dashoffset" from="60" to="0" dur="2s" repeatCount="indefinite" />
        <set attributeName="stroke-dasharray" to="60" />
      </polyline>
    </svg>
  );
}

function TraumaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function IndigenousIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z">
        <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="20s" repeatCount="indefinite" />
      </path>
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  );
}

function FamilyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="7" r="2">
        <animate attributeName="r" values="2;2.3;2" dur="2s" repeatCount="indefinite" />
      </circle>
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <path d="M21 21v-2a3 3 0 00-2-2.83" />
    </svg>
  );
}

function HolisticIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.5-3 8.5-7.5 8.5-13A8.5 8.5 0 0012 1 8.5 8.5 0 003.5 9c0 5.5 3 10 8.5 13z">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M12 22V9" />
      <path d="M8 13c2-1.5 6-1.5 8 0" />
    </svg>
  );
}

function HorseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L18 6l-3-1-4 4 2 3-4 4-3-1-4 5">
        <animate attributeName="stroke-dashoffset" from="80" to="0" dur="3s" repeatCount="indefinite" />
        <set attributeName="stroke-dasharray" to="80" />
      </path>
      <path d="M2 22l3-5 3 1 4-4-2-3 4-4 3 1 3-3" opacity="0.3" />
    </svg>
  );
}

function EvidenceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      <circle cx="12" cy="12" r="1" fill="currentColor">
        <animate attributeName="r" values="0.5;1.5;0.5" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function WhoWeHelpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function DualDiagnosisIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 010 20" fill="currentColor" opacity="0.1">
        <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="8s" repeatCount="indefinite" />
      </path>
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function PillIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="8" rx="4" ry="4" transform="rotate(-45 12 12)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
      </rect>
      <line x1="12" y1="2" x2="12" y2="22" transform="rotate(-45 12 12)" opacity="0.5" />
    </svg>
  );
}

function BottleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2h8v4l2 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V8l2-2V2z" />
      <path d="M6 12h12" />
      <path d="M10 17v-2">
        <animate attributeName="y1" values="17;15;17" dur="1.5s" repeatCount="indefinite" />
      </path>
      <path d="M14 17v-1">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4">
        <animate attributeName="r" values="4;4.4;4" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14l2 2 4-4">
        <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1.5s" repeatCount="indefinite" />
        <set attributeName="stroke-dasharray" to="10" />
      </path>
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z">
        <animateTransform attributeName="transform" type="rotate" values="0 12 12;-5 12 12;5 12 12;0 12 12" dur="0.5s" begin="0s" repeatCount="indefinite" repeatDur="2s" />
      </path>
    </svg>
  );
}

/* ── Icon map for dropdown items ───────────────────────────────────── */

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'Meet Our Team': TeamIcon,
  'Why Us?': StarIcon,
  'Our Philosophy': PhilosophyIcon,
  'FAQs': QuestionIcon,
  'Blog': BlogIcon,
  'Investigative Series': BlogIcon,
  'Careers': CareersIcon,
  'Areas We Serve': MapIcon,
  'Residential Inpatient': HomeIcon,
  'Detoxification': DetoxIcon,
  'Interventions': InterventionIcon,
  'Alumni & Aftercare': AlumniIcon,
  'Trauma Treatment': TraumaIcon,
  'Indigenous Approach': IndigenousIcon,
  'Family Program': FamilyIcon,
  'Holistic Approaches': HolisticIcon,
  'Equine-Assisted Experience': HorseIcon,
  'Evidence-Based Treatment': EvidenceIcon,
  'Who We Help': WhoWeHelpIcon,
  'Dual-Diagnosis': DualDiagnosisIcon,
  'Alcohol Addiction': BottleIcon,
  'Heroin Addiction': PillIcon,
  'Marijuana Addiction': HolisticIcon,
  'Opioid Addiction': PillIcon,
  'Prescription Drug Addiction': PillIcon,
  'Xanax Addiction': PillIcon,
};

/* ── Navigation data ───────────────────────────────────────────────── */

interface DropdownItem {
  label: string;
  href: string;
  description?: string;
}

interface NavItem {
  label: string;
  href: string;
  dropdown?: DropdownItem[];
  description?: string;
}

const navLinks: NavItem[] = [
  {
    label: 'Who We Are',
    href: '/who-we-are',
    description: 'Learn about our mission, team, and commitment to recovery.',
    dropdown: [
      { label: 'Meet Our Team', href: '/who-we-are/meet-our-team', description: 'Experienced clinicians & compassionate staff' },
      { label: 'Why Us?', href: '/who-we-are/why-us', description: 'What sets Seven Arrows apart' },
      { label: 'Our Philosophy', href: '/who-we-are/our-philosophy', description: 'TraumAddiction\u2122 & holistic healing' },
      { label: 'FAQs', href: '/who-we-are/faqs', description: 'Common questions answered' },
      { label: 'Investigative Series', href: '/who-we-are/blog', description: 'The Recovery Roadmap' },
      { label: 'Careers', href: '/who-we-are/careers', description: 'Join our healing community' },
      { label: 'Areas We Serve', href: '/who-we-are/areas-we-serve', description: 'Nationwide admissions from Arizona' },
    ],
  },
  {
    label: 'Treatment',
    href: '/treatment',
    description: 'Clinical & residential programs tailored to your needs.',
    dropdown: [
      { label: 'Interventions', href: '/treatment/interventions', description: 'Professional intervention services' },
      { label: 'Detoxification', href: '/treatment/detoxification', description: 'Medical detox in a safe environment' },
      { label: 'Residential Inpatient', href: '/treatment/residential-inpatient', description: '90+ day immersive treatment' },
      { label: 'Alumni & Aftercare', href: '/treatment/alumni-aftercare', description: 'Lifelong support network' },
    ],
  },
  {
    label: 'Our Program',
    href: '/our-program',
    description: 'Seven core components for mind, body, and spirit.',
    dropdown: [
      { label: 'Trauma Treatment', href: '/our-program/trauma-treatment', description: 'Addressing root causes of addiction' },
      { label: 'Indigenous Approach', href: '/our-program/indigenous-approach', description: 'Cultural & spiritual healing practices' },
      { label: 'Family Program', href: '/our-program/family-program', description: 'Healing the whole family system' },
      { label: 'Holistic Approaches', href: '/our-program/holistic-approaches', description: 'Yoga, meditation & wellness' },
      { label: 'Equine-Assisted Experience', href: '/our-program/equine-assisted', description: 'Healing through horse therapy' },
      { label: 'Evidence-Based Treatment', href: '/our-program/evidence-based', description: 'Proven clinical methodologies' },
      { label: 'Who We Help', href: '/our-program/who-we-help', description: 'Adults seeking lasting recovery' },
    ],
  },
  {
    label: 'What We Treat',
    href: '/what-we-treat',
    description: 'Specialized care for substance use & co-occurring disorders.',
    dropdown: [
      { label: 'Dual-Diagnosis', href: '/what-we-treat/dual-diagnosis', description: 'Addiction & mental health together' },
      { label: 'Alcohol Addiction', href: '/what-we-treat/alcohol-addiction', description: 'Comprehensive alcohol recovery' },
      { label: 'Heroin Addiction', href: '/what-we-treat/heroin-addiction', description: 'Heroin & opioid recovery path' },
      { label: 'Marijuana Addiction', href: '/what-we-treat/marijuana-addiction', description: 'Cannabis dependency treatment' },
      { label: 'Opioid Addiction', href: '/what-we-treat/opioid-addiction', description: 'Fentanyl & opioid detox + recovery' },
      { label: 'Prescription Drug Addiction', href: '/what-we-treat/prescription-drug-addiction', description: 'Safe tapering & recovery' },
      { label: 'Xanax Addiction', href: '/what-we-treat/xanax-addiction', description: 'Benzodiazepine recovery support' },
    ],
  },
  { label: 'Tour', href: '/tour' },
  { label: 'Admissions', href: '/admissions' },
  { label: 'Contact', href: '/contact' },
];

/* ── Mega Menu Dropdown ────────────────────────────────────────────── */

function MegaMenuDropdown({ item, headerRef }: { item: NavItem; headerRef: React.RefObject<HTMLElement | null> }) {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(null);

  const enter = () => {
    if (timeout.current) clearTimeout(timeout.current);
    setOpen(true);
  };

  const leave = () => {
    timeout.current = setTimeout(() => setOpen(false), 200);
  };

  // Close on scroll so users can scroll past the menu
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [open]);

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  // Calculate columns: use one row if 4 or fewer items, otherwise up to 4 items per column
  const itemCount = item.dropdown?.length ?? 0;
  const cols = itemCount <= 4 ? itemCount : Math.min(Math.ceil(itemCount / 4), 3);

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        className="flex items-center gap-0.5 px-1.5 xl:px-3 py-2 text-[10px] xl:text-xs font-semibold tracking-[0.06em] xl:tracking-[0.08em] uppercase text-foreground/80 hover:text-primary transition-colors whitespace-nowrap"
        style={{ fontFamily: 'var(--font-body)' }}
        aria-expanded={open}
      >
        {item.label}
        <svg className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Backdrop — only covers area below header, allows scroll-through */}
      {open && (
        <div
          className="fixed left-0 right-0 bottom-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
          style={{
            top: (headerRef.current?.getBoundingClientRect().bottom ?? 68) + 'px',
            backgroundColor: 'rgba(0,0,0,0.15)',
            transition: 'background-color 0.3s ease',
          }}
        />
      )}
      <div
        className={`fixed left-0 right-0 z-50 transition-all duration-300 ease-out ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          top: (headerRef.current?.getBoundingClientRect().bottom ?? 68) + 'px',
        }}
        onMouseEnter={enter}
        onMouseLeave={leave}
      >
        {/* Gradient reveal bar */}
        <div
          className="h-1 w-full transition-all duration-500"
          style={{
            background: open
              ? 'linear-gradient(90deg, transparent 0%, var(--color-primary) 20%, var(--color-accent) 50%, var(--color-primary) 80%, transparent 100%)'
              : 'transparent',
            opacity: open ? 1 : 0,
            transform: open ? 'scaleX(1)' : 'scaleX(0)',
          }}
        />
        <div
          className="shadow-2xl transition-all duration-300 ease-out"
          style={{
            transform: open ? 'translateY(0)' : 'translateY(-8px)',
            opacity: open ? 1 : 0,
            backgroundColor: '#ffffff',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="py-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              <Link
                to={item.href}
                className="text-xs font-bold hover:text-primary transition-colors tracking-wider uppercase"
                style={{ fontFamily: 'var(--font-body)', color: '#1a1a1a' }}
                onClick={() => setOpen(false)}
              >
                {item.label} Overview →
              </Link>
              {item.description && (
                <p className="text-[11px] mt-0.5" style={{ fontFamily: 'var(--font-body)', color: 'rgba(26,26,26,0.5)' }}>{item.description}</p>
              )}
            </div>

            {/* Items grid — layout varies by menu */}
            {item.label === 'Treatment' ? (
              /* Treatment: 4 icon cards in a row */
              <div>
                <div className="grid grid-cols-4 gap-4 py-6">
                  {item.dropdown?.map((sub, idx) => {
                    const Icon = iconMap[sub.label];
                    return (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        className="group flex flex-col items-center text-center px-5 py-5 rounded-xl border border-transparent transition-all duration-200 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5"
                        onClick={() => setOpen(false)}
                        style={{
                          opacity: open ? 1 : 0,
                          transform: open ? 'translateY(0)' : 'translateY(8px)',
                          transition: `all 0.3s ease-out ${0.05 + idx * 0.03}s`,
                          backgroundColor: 'rgba(160,82,45,0.03)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(160,82,45,0.07)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(160,82,45,0.03)'; }}
                      >
                        {Icon && (
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-3" style={{ backgroundColor: 'rgba(160,82,45,0.1)' }}>
                            <Icon className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        <div className="text-[13px] font-semibold group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-body)', color: '#1a1a1a' }}>{sub.label}</div>
                        {sub.description && <p className="text-[11px] mt-1 leading-snug" style={{ fontFamily: 'var(--font-body)', color: 'rgba(26,26,26,0.45)' }}>{sub.description}</p>}
                      </Link>
                    );
                  })}
                </div>
                <p className="text-center text-[11px] tracking-[0.15em] uppercase pb-3" style={{ fontFamily: 'var(--font-body)', color: 'rgba(160,82,45,0.6)' }}>Here for every step of the way</p>
              </div>
            ) : item.label === 'Who We Are' ? (
              /* Who We Are: Featured "Meet Our Team" + 3 cols of 2 for the rest */
              <div className="py-5">
                <div className="grid grid-cols-4 gap-4">
                  {/* Featured: Meet Our Team */}
                  {item.dropdown?.slice(0, 1).map((sub, idx) => {
                    const Icon = iconMap[sub.label];
                    return (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        className="group row-span-2 flex flex-col items-center justify-center text-center px-6 py-8 rounded-xl border border-primary/15 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
                        onClick={() => setOpen(false)}
                        style={{ backgroundColor: 'rgba(160,82,45,0.05)', opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.3s ease-out 0.05s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(160,82,45,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(160,82,45,0.05)'; }}
                      >
                        {Icon && (
                          <div className="w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-4" style={{ backgroundColor: 'rgba(160,82,45,0.12)' }}>
                            <Icon className="w-7 h-7 text-primary" />
                          </div>
                        )}
                        <div className="text-[15px] font-bold group-hover:text-primary transition-colors mb-1" style={{ fontFamily: 'var(--font-body)', color: '#1a1a1a' }}>{sub.label}</div>
                        {sub.description && <p className="text-[11px] leading-snug" style={{ fontFamily: 'var(--font-body)', color: 'rgba(26,26,26,0.5)' }}>{sub.description}</p>}
                      </Link>
                    );
                  })}
                  {/* Rest: 3 cols of 2 rows */}
                  {item.dropdown?.slice(1).map((sub, idx) => {
                    const Icon = iconMap[sub.label];
                    return (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        className="group flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200"
                        onClick={() => setOpen(false)}
                        style={{ opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(8px)', transition: `all 0.3s ease-out ${0.05 + (idx + 1) * 0.03}s` }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(160,82,45,0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {Icon && (
                          <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform mt-0.5" style={{ backgroundColor: 'rgba(160,82,45,0.1)' }}>
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="text-[13px] font-semibold group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-body)', color: '#1a1a1a' }}>{sub.label}</div>
                          {sub.description && <p className="text-[11px] mt-0.5 leading-snug" style={{ fontFamily: 'var(--font-body)', color: 'rgba(26,26,26,0.5)' }}>{sub.description}</p>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : item.label === 'What We Treat' ? (
              /* What We Treat: 4 columns of 2 rows */
              <div className="grid grid-cols-4 gap-x-4 gap-y-1 py-5">
                {item.dropdown?.map((sub, idx) => {
                  const Icon = iconMap[sub.label];
                  return (
                    <Link
                      key={sub.href}
                      to={sub.href}
                      className="group flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200"
                      onClick={() => setOpen(false)}
                      style={{ opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(8px)', transition: `all 0.3s ease-out ${0.05 + idx * 0.03}s` }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(160,82,45,0.06)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {Icon && (
                        <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform mt-0.5" style={{ backgroundColor: 'rgba(160,82,45,0.1)' }}>
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div>
                        <div className="text-[13px] font-semibold group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-body)', color: '#1a1a1a' }}>{sub.label}</div>
                        {sub.description && <p className="text-[11px] mt-0.5 leading-snug" style={{ fontFamily: 'var(--font-body)', color: 'rgba(26,26,26,0.5)' }}>{sub.description}</p>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : item.label === 'Our Program' ? (
              /* Our Program: icon cards like Treatment but in a 4-col grid with wrapping */
              <div className="grid grid-cols-4 gap-4 py-6">
                {item.dropdown?.map((sub, idx) => {
                  const Icon = iconMap[sub.label];
                  return (
                    <Link
                      key={sub.href}
                      to={sub.href}
                      className="group flex flex-col items-center text-center px-4 py-4 rounded-xl border border-transparent transition-all duration-200 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5"
                      onClick={() => setOpen(false)}
                      style={{
                        opacity: open ? 1 : 0,
                        transform: open ? 'translateY(0)' : 'translateY(8px)',
                        transition: `all 0.3s ease-out ${0.05 + idx * 0.03}s`,
                        backgroundColor: 'rgba(160,82,45,0.03)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(160,82,45,0.07)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(160,82,45,0.03)'; }}
                    >
                      {Icon && (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform mb-2" style={{ backgroundColor: 'rgba(160,82,45,0.1)' }}>
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="text-[12px] font-semibold group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-body)', color: '#1a1a1a' }}>{sub.label}</div>
                      {sub.description && <p className="text-[10px] mt-1 leading-snug" style={{ fontFamily: 'var(--font-body)', color: 'rgba(26,26,26,0.45)' }}>{sub.description}</p>}
                    </Link>
                  );
                })}
              </div>
            ) : (
              /* Fallback: standard grid */
              <div className={`grid gap-x-4 gap-y-0.5 py-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {item.dropdown?.map((sub, idx) => {
                  const Icon = iconMap[sub.label];
                  return (
                    <Link
                      key={sub.href}
                      to={sub.href}
                      className="group flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200"
                      onClick={() => setOpen(false)}
                      style={{ opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(8px)', transition: `all 0.3s ease-out ${0.05 + idx * 0.03}s` }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(160,82,45,0.06)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {Icon && (
                        <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform mt-0.5" style={{ backgroundColor: 'rgba(160,82,45,0.1)' }}>
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div>
                        <div className="text-[13px] font-semibold group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-body)', color: '#1a1a1a' }}>{sub.label}</div>
                        {sub.description && <p className="text-[11px] mt-0.5 leading-snug" style={{ fontFamily: 'var(--font-body)', color: 'rgba(26,26,26,0.5)' }}>{sub.description}</p>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Footer CTA */}
            <div className="py-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <a href="tel:+18669964308" className="flex items-center gap-2 text-[11px] text-primary font-semibold hover:text-primary-dark transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                <PhoneIcon className="w-3 h-3" />
                Questions? Call (866) 996-4308
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Header Component ──────────────────────────────────────────────── */

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  const toggleMobileDropdown = (label: string) => {
    setMobileExpanded(mobileExpanded === label ? null : label);
  };

  return (
    <header ref={headerRef} className="bg-white sticky top-0 z-50 shadow-sm" role="banner">
      <nav className="px-4 sm:px-6 xl:px-10" aria-label="Main navigation">
        <div className="flex items-center h-16 lg:h-[68px]">
          {/* Logo — compact */}
          <Link to="/" className="shrink-0 mr-2 xl:mr-6" aria-label="Seven Arrows Recovery - Home">
            <img
              src="/7a/images/logo.png"
              alt="Seven Arrows Recovery"
              className="h-11 lg:h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation — spread across full width */}
          <div className="hidden lg:flex items-center gap-0 xl:gap-1 flex-1 min-w-0">
            {navLinks.map((item) =>
              item.dropdown ? (
                <MegaMenuDropdown key={item.href} item={item} headerRef={headerRef} />
              ) : (
                <Link
                  key={item.href}
                  to={item.href}
                  className="px-1.5 xl:px-3 py-2 text-[10px] xl:text-xs font-semibold tracking-[0.06em] xl:tracking-[0.08em] uppercase text-foreground/80 hover:text-primary transition-colors whitespace-nowrap"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {item.label}
                </Link>
              )
            )}
          </div>

          {/* Phone CTA — prominent with pulse */}
          <a
            href="tel:+18669964308"
            className="hidden lg:inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white px-3 xl:px-5 py-2 xl:py-2.5 rounded-full text-xs xl:text-sm font-bold tracking-wide transition-all whitespace-nowrap shrink-0 ml-2 xl:ml-4 relative"
            style={{ fontFamily: 'var(--font-body)', boxShadow: '0 2px 12px rgba(160,82,45,0.35)' }}
            aria-label="Call us at (866) 996-4308"
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-primary" style={{ animationDuration: '2s' }} />
            <span className="relative flex items-center gap-2">
              <PhoneIcon className="w-4 h-4" />
              (866) 996-4308
            </span>
          </a>

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 text-foreground ml-auto"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 border-t border-gray-100" role="menu">
            <div className="pt-3 space-y-0.5">
              {navLinks.map((item) => (
                <div key={item.href}>
                  {item.dropdown ? (
                    <>
                      <button
                        type="button"
                        className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-semibold tracking-wider uppercase text-foreground hover:text-primary"
                        style={{ fontFamily: 'var(--font-body)' }}
                        onClick={() => toggleMobileDropdown(item.label)}
                        aria-expanded={mobileExpanded === item.label}
                      >
                        {item.label}
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${mobileExpanded === item.label ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {mobileExpanded === item.label && (
                        <div className="bg-warm-bg">
                          {item.dropdown.map((sub) => {
                            const Icon = iconMap[sub.label];
                            return (
                              <Link
                                key={sub.href}
                                to={sub.href}
                                className="flex items-center gap-2.5 px-5 py-2.5 text-sm text-foreground hover:text-primary border-b border-foreground/5 last:border-b-0"
                                role="menuitem"
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                {Icon && (
                                  <div className="shrink-0 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                                    <Icon className="w-3 h-3 text-primary" />
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>{sub.label}</div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.href}
                      className="block px-3 py-2.5 text-xs font-semibold tracking-wider uppercase text-foreground hover:text-primary"
                      style={{ fontFamily: 'var(--font-body)' }}
                      role="menuitem"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
              <div className="px-3 pt-3">
                <a href="tel:+18669964308" className="btn-primary w-full text-center flex items-center justify-center gap-2 text-xs py-3">
                  <PhoneIcon className="w-3.5 h-3.5" />
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
