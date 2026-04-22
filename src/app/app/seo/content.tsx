'use client';

/**
 * SEO workspace — scaffold. Tracks head-term positions, page health,
 * and content-brief status across the marketing site. Real data
 * integrations (Search Console, Ahrefs / SEMrush exports) can land
 * later; the page ships today as a shell with the panels laid out so
 * the team can start copy-pasting priorities into it.
 */
export default function SeoContent() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
          Marketing &amp; Admissions
        </p>
        <h1 className="text-2xl font-bold text-foreground">SEO</h1>
        <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
          Track keyword performance, page health, and open content
          briefs across sevenarrowsrecovery.com.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { k: 'Tracked keywords', v: '—' },
          { k: 'Top-10 rankings', v: '—' },
          { k: 'Pages in top 3', v: '—' },
          { k: 'Domain authority', v: '—' },
        ].map((s) => (
          <div key={s.k} className="rounded-xl border border-black/5 bg-white p-5">
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mb-2">
              {s.k}
            </p>
            <p className="text-3xl font-bold text-foreground">{s.v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Priority head terms" hint="Drug rehab in Arizona, boutique rehab, trauma-informed rehab…" />
        <Panel title="Page health" hint="Core Web Vitals, indexation status, schema coverage." />
        <Panel title="Content briefs" hint="Open topics, drafts in progress, published pieces." />
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
