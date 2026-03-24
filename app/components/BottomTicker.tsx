import { Link } from '@remix-run/react';

const tickerItems = [
  { type: 'stat', text: '4.9/5 Google Rating' },
  { type: 'review', text: '"Seven Arrows saved my life." — Michael T.' },
  { type: 'stat', text: '6:1 Client to Staff Ratio' },
  { type: 'link', text: 'NEW: When Drinking Stops Working →', href: '/who-we-are/blog/when-drinking-stops-working' },
  { type: 'stat', text: '90+ Day Programs Available' },
  { type: 'review', text: '"We finally have our son back." — Sarah K.' },
  { type: 'stat', text: '24/7 Admissions Support' },
  { type: 'review', text: '"This place is different." — James R.' },
  { type: 'stat', text: 'JCAHO Accredited • LegitScript Certified' },
];

function TickerContent() {
  return (
    <>
      {tickerItems.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-3 mx-6 whitespace-nowrap">
          {item.type === 'stat' && (
            <span className="text-accent font-semibold text-xs tracking-wider uppercase" style={{ fontFamily: 'var(--font-body)' }}>
              {item.text}
            </span>
          )}
          {item.type === 'review' && (
            <span className="text-white/80 text-xs italic" style={{ fontFamily: 'var(--font-body)' }}>
              {item.text}
            </span>
          )}
          {item.type === 'link' && item.href && (
            <Link
              to={item.href}
              className="text-white text-xs font-semibold hover:text-accent transition-colors underline decoration-accent/50"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {item.text}
            </Link>
          )}
          <span className="text-white/20">•</span>
        </span>
      ))}
    </>
  );
}

export default function BottomTicker() {
  return (
    <div className="hidden lg:block bg-dark-section border-t border-white/5 py-3 overflow-hidden">
      <div className="flex animate-ticker" style={{ width: 'max-content' }}>
        <div className="flex items-center shrink-0">
          <TickerContent />
        </div>
        <div className="flex items-center shrink-0">
          <TickerContent />
        </div>
      </div>
    </div>
  );
}
