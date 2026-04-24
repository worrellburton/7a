'use client';

import Link from 'next/link';

/**
 * GEO workspace — "Generative Engine Optimization" scaffold. Tracks
 * how the brand surfaces inside AI answer engines (ChatGPT, Perplexity,
 * Google AI Overviews, Claude Search) alongside the classic
 * SEO signals on the neighboring /app/seo page.
 */
export default function GeoContent() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
            Marketing &amp; Admissions
          </p>
          <h1 className="text-2xl font-bold text-foreground">GEO</h1>
          <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
            Generative-engine optimization. Track how Seven Arrows surfaces
            in AI answer engines — ChatGPT, Perplexity, Google AI Overviews,
            and Claude Search — across the queries our admissions funnel
            depends on.
          </p>
        </div>
        <Link
          href="/app/geo/audit"
          className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-warm-bg/40 transition"
        >
          GEO audit →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { k: 'Tracked prompts', v: '—' },
          { k: 'Mentions (wk)', v: '—' },
          { k: 'Citation rate', v: '—' },
          { k: 'Answer sentiment', v: '—' },
        ].map((s) => (
          <div key={s.k} className="rounded-xl border border-black/5 bg-white p-5">
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mb-2">
              {s.k}
            </p>
            <p className="text-3xl font-bold text-foreground">{s.v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          title="Tracked prompt set"
          hint='e.g. "Best trauma-informed rehab in Arizona", "Seven Arrows Recovery review", "Rehabs that accept Aetna in AZ".'
        />
        <Panel
          title="Citation sources"
          hint="Which pages each answer engine cites when it references us — and which are missing."
        />
      </div>
    </div>
  );
}

function Panel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 min-h-[260px]">
      <h2 className="text-base font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-foreground/60 leading-relaxed">{hint}</p>
      <div className="mt-6 rounded-lg border border-dashed border-black/10 bg-warm-bg/40 p-4 text-xs text-foreground/50">
        Connect a data source or drop items here.
      </div>
    </div>
  );
}
