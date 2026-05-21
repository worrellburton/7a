'use client';

import type { ReactNode } from 'react';

// Single source of truth for the "log a contact" method options.
// Both /app/outreach and /app/partnerships log contact interactions
// against contacts / partners with the same allowed method set; this
// file keeps the type, the visual tones, and the SVG icons in one
// place so adding a new method (e.g. Smoke Signals) is a one-line
// change across the platform.
//
// The matching server-side allowlists live in:
//   src/app/api/contacts/[id]/log-contact/route.ts
//   src/app/api/partnerships/[id]/log-contact/route.ts
//   src/app/api/contacts/[id]/history/[logId]/route.ts
// Keep them in sync with CONTACT_METHODS below.

export type ContactMethod =
  | 'Phone'
  | 'In Person'
  | 'Left Message'
  | 'Text Message'
  | 'Email'
  | 'Data Entry'
  | 'Smoke Signals'
  | 'Walkie Talkie'
  | 'Tin Can Phone';

export interface ContactMethodOption {
  value: ContactMethod;
  label: string;
  // tailwind tones for the pill/chip rendering of this method in the table
  tone: string;
  // tone used in the bars chart on /app/outreach
  barGradient: string;
  helpText: string;
  Icon: () => ReactNode;
}

// ─── SVG icons ───────────────────────────────────────────────────
// All icons share a 20x20 viewBox + currentColor strokes so they
// pick up the chip/button's text color. Sized via parent CSS rather
// than width/height attrs.

const IconWrap = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
    aria-hidden="true"
  >
    {children}
  </svg>
);

function PhoneIcon() {
  return (
    <IconWrap>
      <path d="M5 3.5h3l1.6 4-2 1.3a10 10 0 0 0 4.6 4.6L13.5 11.4l4 1.6V16a1.5 1.5 0 0 1-1.5 1.5C8.4 17.5 2.5 11.6 2.5 4.5A1.5 1.5 0 0 1 4 3z" />
    </IconWrap>
  );
}

function InPersonIcon() {
  return (
    <IconWrap>
      <circle cx="10" cy="6.5" r="2.7" />
      <path d="M3.5 17c0-3.4 2.9-6 6.5-6s6.5 2.6 6.5 6" />
    </IconWrap>
  );
}

function LeftMessageIcon() {
  // Voicemail — two reels connected by a tape segment.
  return (
    <IconWrap>
      <circle cx="6" cy="11" r="3" />
      <circle cx="14" cy="11" r="3" />
      <path d="M6 11h8" />
    </IconWrap>
  );
}

function TextMessageIcon() {
  return (
    <IconWrap>
      <path d="M3 5.5A2 2 0 0 1 5 3.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8l-3 3v-3H5a2 2 0 0 1-2-2z" />
      <circle cx="7.5" cy="8.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="10" cy="8.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="8.5" r="0.5" fill="currentColor" stroke="none" />
    </IconWrap>
  );
}

function EmailIcon() {
  return (
    <IconWrap>
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
      <path d="M3 5.5l7 5.5 7-5.5" />
    </IconWrap>
  );
}

function SmokeSignalsIcon() {
  return (
    <IconWrap>
      {/* Curling smoke plumes */}
      <path d="M7 8c0-1 1-1.5 1-2.5s-1-1.5-1-2.5" />
      <path d="M10 7c0-1 1-1.5 1-2.5s-1-1.5-1-2.5" />
      <path d="M13 8c0-1 1-1.5 1-2.5s-1-1.5-1-2.5" />
      {/* Campfire triangle / logs */}
      <path d="M4 17l6-7 6 7z" />
      <path d="M7 17l3-3 3 3" />
    </IconWrap>
  );
}

function WalkieTalkieIcon() {
  return (
    <IconWrap>
      {/* Antenna */}
      <path d="M11 2v4" />
      {/* Body */}
      <rect x="5.5" y="6" width="9" height="11" rx="1.2" />
      {/* Speaker grill (three slits) */}
      <path d="M7.5 8.5h5M7.5 10h5M7.5 11.5h5" />
      {/* Push-to-talk button */}
      <circle cx="10" cy="14.5" r="1" />
    </IconWrap>
  );
}

function DataEntryIcon() {
  // Pencil scribbling into a card — reads as 'filling in a record'
  // at a glance without competing with the other 'reaching out' icons.
  return (
    <IconWrap>
      <rect x="2.5" y="5" width="11" height="9" rx="1.5" />
      <path d="M5 8h5M5 11h3" />
      <path d="M13 4l3 3-6 6h-3v-3z" />
    </IconWrap>
  );
}

function TinCanPhoneIcon() {
  return (
    <IconWrap>
      {/* Two cans */}
      <path d="M3 7l2.5-1v8L3 13z" />
      <path d="M17 7l-2.5-1v8L17 13z" />
      {/* Can rims */}
      <path d="M5.5 6l0 8M14.5 6l0 8" />
      {/* Taut string between them */}
      <path d="M5.5 10h9" strokeDasharray="0.6 1.2" />
    </IconWrap>
  );
}

// ─── Method registry ─────────────────────────────────────────────

export const CONTACT_METHODS: ContactMethodOption[] = [
  {
    value: 'Phone',
    label: 'Phone',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    barGradient: 'linear-gradient(90deg, #10b981, #059669)',
    helpText: 'Live phone call.',
    Icon: PhoneIcon,
  },
  {
    value: 'In Person',
    label: 'In Person',
    tone: 'bg-blue-50 text-blue-700 border-blue-200',
    barGradient: 'linear-gradient(90deg, #38bdf8, #0284c7)',
    helpText: 'Face-to-face meeting or visit.',
    Icon: InPersonIcon,
  },
  {
    value: 'Left Message',
    label: 'Left Message',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    barGradient: 'linear-gradient(90deg, #fbbf24, #d97706)',
    helpText: 'Voicemail or unreturned attempt.',
    Icon: LeftMessageIcon,
  },
  {
    value: 'Text Message',
    label: 'Text Message',
    tone: 'bg-violet-50 text-violet-700 border-violet-200',
    barGradient: 'linear-gradient(90deg, #a78bfa, #7c3aed)',
    helpText: 'SMS / iMessage.',
    Icon: TextMessageIcon,
  },
  {
    value: 'Email',
    label: 'Email',
    tone: 'bg-rose-50 text-rose-700 border-rose-200',
    barGradient: 'linear-gradient(90deg, #fb7185, #e11d48)',
    helpText: 'Email outreach.',
    Icon: EmailIcon,
  },
  {
    value: 'Data Entry',
    label: 'Data Entry',
    tone: 'bg-sky-50 text-sky-700 border-sky-200',
    barGradient: 'linear-gradient(90deg, #38bdf8, #0284c7)',
    helpText: 'Filled a missing field (email / phone / company / role / location / specialty / type).',
    Icon: DataEntryIcon,
  },
  {
    value: 'Smoke Signals',
    label: 'Smoke Signals',
    tone: 'bg-stone-100 text-stone-700 border-stone-300',
    barGradient: 'linear-gradient(90deg, #a8a29e, #57534e)',
    helpText: 'When all else fails.',
    Icon: SmokeSignalsIcon,
  },
  {
    value: 'Walkie Talkie',
    label: 'Walkie Talkie',
    tone: 'bg-teal-50 text-teal-700 border-teal-200',
    barGradient: 'linear-gradient(90deg, #2dd4bf, #0f766e)',
    helpText: 'Over and out.',
    Icon: WalkieTalkieIcon,
  },
  {
    value: 'Tin Can Phone',
    label: 'Tin Can Phone',
    tone: 'bg-orange-50 text-orange-700 border-orange-200',
    barGradient: 'linear-gradient(90deg, #fb923c, #c2410c)',
    helpText: 'Cup, string, cup. Old reliable.',
    Icon: TinCanPhoneIcon,
  },
];

export const CONTACT_METHOD_BY_VALUE: Record<ContactMethod, ContactMethodOption> = Object.fromEntries(
  CONTACT_METHODS.map((m) => [m.value, m]),
) as Record<ContactMethod, ContactMethodOption>;

export const METHOD_TONES: Record<ContactMethod, string> = Object.fromEntries(
  CONTACT_METHODS.map((m) => [m.value, m.tone]),
) as Record<ContactMethod, string>;

// ─── Grid picker ─────────────────────────────────────────────────

export function ContactMethodPicker({
  value,
  onChange,
  columns = 4,
}: {
  value: ContactMethod;
  onChange: (next: ContactMethod) => void;
  columns?: 2 | 3 | 4;
}) {
  const colClass = columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4';
  return (
    <div className={`grid ${colClass} gap-2`}>
      {CONTACT_METHODS.map(({ value: v, label, tone, Icon, helpText }) => {
        const selected = v === value;
        return (
          <button
            type="button"
            key={v}
            onClick={() => onChange(v)}
            title={helpText}
            aria-pressed={selected}
            className={`group flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-[11px] font-semibold transition-all ${
              selected
                ? `${tone} ring-2 ring-offset-1 ring-current/40 shadow-sm`
                : 'bg-white text-foreground/70 border-black/10 hover:border-black/25 hover:bg-warm-bg/40'
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                selected ? 'bg-white/60' : 'bg-warm-bg/60 text-foreground/60 group-hover:text-foreground/85'
              }`}
            >
              <Icon />
            </span>
            <span className="leading-tight text-center">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Small inline icon + label chip used in tables / list rows.
export function ContactMethodChip({ method, size = 'sm' }: { method: ContactMethod; size?: 'sm' | 'xs' }) {
  const opt = CONTACT_METHOD_BY_VALUE[method];
  if (!opt) return null;
  const Icon = opt.Icon;
  const padding = size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border font-semibold ${opt.tone} ${padding}`}>
      <span className={size === 'xs' ? 'scale-75 origin-left' : ''}><Icon /></span>
      <span>{opt.label}</span>
    </span>
  );
}
