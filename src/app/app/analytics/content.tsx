'use client';

/**
 * Analytics workspace — scaffold. Unified view over GA4, CallTrackingMetrics,
 * and internal funnel data. Built as a shell so the team can drop in live
 * widgets (traffic, calls, form completions, cost per admission) without
 * rewiring navigation.
 */
export default function AnalyticsContent() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
          Marketing &amp; Admissions
        </p>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
          Marketing funnel performance across sessions, calls, form
          completions, and admissions. GA4, CallTrackingMetrics, and
          admissions-pipeline data unified in one surface.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { k: 'Sessions (30d)', v: '—' },
          { k: 'Inbound calls', v: '—' },
          { k: 'Form submissions', v: '—' },
          { k: 'Admissions', v: '—' },
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
        <Panel title="Traffic by channel" hint="Organic search, direct, referral, paid — weekly." />
        <Panel title="Funnel" hint="Session → call / form → qualified → admitted." />
        <Panel title="Top landing pages" hint="Entry pages by sessions, calls, and admissions." />
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
