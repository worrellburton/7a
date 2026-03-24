import { Link } from '@remix-run/react';

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75">
        <animate attributeName="stroke-dashoffset" from="100" to="0" dur="3s" repeatCount="indefinite" />
        <set attributeName="stroke-dasharray" to="100" />
      </path>
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4">
        <animate attributeName="r" values="4;4.3;4" dur="2s" repeatCount="indefinite" />
      </circle>
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function MountainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3l4 8 5-5 5 15H2L8 3z">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
      </path>
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
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function SproutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12" />
      <path d="M12 12C12 7 7 2 7 2s0 5 5 10">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite" />
      </path>
      <path d="M12 12c0-5 5-10 5-10s0 5-5 10">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" begin="0.5s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function FeatherIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z">
        <animateTransform attributeName="transform" type="rotate" values="0 12 12;2 12 12;0 12 12;-2 12 12;0 12 12" dur="3s" repeatCount="indefinite" />
      </path>
      <line x1="16" y1="8" x2="2" y2="22" />
      <line x1="17.5" y1="15" x2="9" y2="15" />
    </svg>
  );
}

const principles = [
  { Icon: LeafIcon, label: 'Holistic' },
  { Icon: UsersIcon, label: 'Client-Focused' },
  { Icon: MountainIcon, label: "Nature's Touch" },
  { Icon: HorseIcon, label: 'Healing Horses' },
  { Icon: HeartIcon, label: 'Wellness in Everything' },
  { Icon: SproutIcon, label: 'Rooted in Healing' },
  { Icon: FeatherIcon, label: 'Indigenous Connections' },
];

export default function SevenArrowsExperience() {
  return (
    <section className="py-20 lg:py-28 bg-warm-bg relative overflow-hidden" aria-labelledby="experience-heading">
      {/* Subtle background watermark */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cpath d='M100 20 L120 80 L100 60 L80 80 Z' fill='%23a0522d'/%3E%3Ccircle cx='100' cy='100' r='30' stroke='%23a0522d' fill='none' stroke-width='2'/%3E%3C/svg%3E")`,
          backgroundSize: '300px 300px',
          backgroundPosition: 'center',
          backgroundRepeat: 'repeat',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Logo */}
        <div className="mb-6">
          <img
            src="/7a/images/logo.png"
            alt=""
            className="h-16 w-auto mx-auto opacity-30"
            aria-hidden="true"
          />
        </div>

        <p className="section-label justify-center mb-4">
          What Makes Us Different from the Rest
        </p>
        <h2
          id="experience-heading"
          className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6"
        >
          The Seven Arrows Experience Defined.
        </h2>
        <p
          className="text-foreground/70 leading-relaxed max-w-3xl mx-auto mb-10"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Choosing Seven Arrows Recovery for addiction treatment in Arizona means that you
          are choosing a different approach to addiction treatment. Our program is rooted
          in 7 core components that combine traditional, holistic, evidence-based,
          alternative and spiritual approaches to allow for a truly healing experience
          for your mind, your body and your spirit.
        </p>

        {/* 7 Principles with animated SVG icons */}
        <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-8 mb-12">
          {principles.map((p) => (
            <div key={p.label} className="flex items-center gap-2 text-foreground/80 group">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <p.Icon className="w-4 h-4 text-primary" />
              </div>
              <span
                className="text-sm font-medium"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {p.label}
              </span>
            </div>
          ))}
        </div>

        <Link href="/our-program" className="btn-dark">
          Our Seven Core Principles
        </Link>
      </div>
    </section>
  );
}
