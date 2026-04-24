import type { ReactNode } from 'react';

type Source = { label: string; href: string };

type Props = {
  question: string;
  id?: string;
  answer: ReactNode;
  bullets?: { label: string; body: ReactNode }[];
  sources?: Source[];
  tone?: 'warm' | 'bg';
};

export default function GeoAnswer({
  question,
  id,
  answer,
  bullets,
  sources,
  tone = 'warm',
}: Props) {
  const bg = tone === 'bg' ? 'bg-warm-bg' : '';
  return (
    <section className={`py-16 lg:py-24 ${bg}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          id={id}
          className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-6"
        >
          {question}
        </h2>
        <div
          className="text-foreground/80 leading-relaxed text-lg mb-8"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {answer}
        </div>
        {bullets && bullets.length > 0 ? (
          <ul className="space-y-4 mb-8">
            {bullets.map((b) => (
              <li
                key={b.label}
                className="bg-warm-card rounded-xl p-5 border border-foreground/5"
              >
                <strong className="block text-foreground font-semibold mb-1">
                  {b.label}
                </strong>
                <span
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {b.body}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {sources && sources.length > 0 ? (
          <p
            className="text-sm text-foreground/60"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Sources:{' '}
            {sources.map((s, i) => (
              <span key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {s.label}
                </a>
                {i < sources.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </section>
  );
}
