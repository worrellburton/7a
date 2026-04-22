'use client';

/**
 * Research workspace — scaffold. A home for clinical citations,
 * competitor teardowns, market scans, and the evidence base behind
 * our messaging. Paired with SEO/GEO/Analytics so the marketing team
 * can move from "what's happening" to "why, and what do we do about
 * it" in one place.
 */
export default function ResearchContent() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
          Marketing &amp; Admissions
        </p>
        <h1 className="text-2xl font-bold text-foreground">Research</h1>
        <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
          Clinical citations, competitor teardowns, market scans, and
          the evidence base behind our messaging. Keep the library our
          writers and admissions team actually reach for.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { k: 'Saved studies', v: '—' },
          { k: 'Competitor scans', v: '—' },
          { k: 'Open briefs', v: '—' },
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
        <Panel title="Clinical evidence library" hint="ACE, Forward-Facing Freedom®, somatic & polyvagal sources." />
        <Panel title="Competitive landscape" hint="Facilities we're benchmarked against — positioning, pricing, gaps." />
        <Panel title="Audience research" hint="Family vs. client language, fears, triggers, decision paths." />
        <Panel title="Payer & regulatory" hint="LegitScript, Joint Commission, CARF, HIPAA updates and deadlines." />
      </div>
    </div>
  );
}

function Panel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 min-h-[220px]">
      <h2 className="text-base font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-foreground/60 leading-relaxed">{hint}</p>
      <div className="mt-6 rounded-lg border border-dashed border-black/10 bg-warm-bg/40 p-4 text-xs text-foreground/50">
        Drop files, links, or briefs here.
      </div>
    </div>
  );
}
