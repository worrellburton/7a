'use client';

import Link from 'next/link';

export default function AuditContent() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
            Marketing &amp; Admissions
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/app/seo"
              className="text-xs text-foreground/50 hover:text-foreground transition"
            >
              ← SEO
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Site audit</h1>
          <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
            Crawls the live site, scores it 0–100 against modern SEO criteria, and
            generates a paste-ready prompt to push the score to 100. No Google
            Search Console required — this audit reads the site directly.
          </p>
        </div>
      </div>

      <ScoreCard score={null} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Panel title="What's working">
          <Empty>Run an audit to see the strengths.</Empty>
        </Panel>
        <Panel title="What's not">
          <Empty>Run an audit to see what's holding the score down.</Empty>
        </Panel>
      </div>

      <Panel title="Sitemap" className="mt-6">
        <Empty>Run an audit to load the live sitemap.</Empty>
      </Panel>

      <Panel title="Generate Claude prompt" className="mt-6">
        <Empty>
          After an audit completes, this section will produce a copy-pasteable
          prompt you can drop into Claude to bring the score to 100.
        </Empty>
      </Panel>
    </div>
  );
}

function ScoreCard({ score }: { score: number | null }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-8 flex items-center gap-8">
      <div className="flex flex-col items-center">
        <div className="text-7xl font-bold text-foreground/30 leading-none">
          {score ?? '—'}
        </div>
        <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/50 mt-2">
          out of 100
        </div>
      </div>
      <div className="flex-1">
        <h2 className="text-base font-bold text-foreground mb-1">SEO score</h2>
        <p className="text-sm text-foreground/60">
          A weighted score across titles, meta, headings, schema, links, images,
          performance, and crawlability. Hit "Run audit" to compute.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Run audit
        </button>
        <p className="mt-2 text-[11px] text-foreground/40">
          Audit runner ships in Phase 2.
        </p>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-black/5 bg-white p-6 ${className}`}>
      <h2 className="text-base font-bold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-black/10 bg-warm-bg/40 p-4 text-xs text-foreground/50">
      {children}
    </div>
  );
}
