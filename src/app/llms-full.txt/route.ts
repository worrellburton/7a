import { getAllEpisodesNewestFirst, episodeHref, getHiddenSlugs, type Episode } from '@/lib/episodes';
import type { SubstanceContent } from '@/lib/substances/types';
import { alcoholContent } from '@/lib/substances/alcohol';
import { benzoContent } from '@/lib/substances/benzodiazepine';
import { heroinContent } from '@/lib/substances/heroin';
import { inhalantsContent } from '@/lib/substances/inhalants';
import { ketamineContent } from '@/lib/substances/ketamine';
import { marijuanaContent } from '@/lib/substances/marijuana';
import { methContent } from '@/lib/substances/methamphetamine';
import { opioidContent } from '@/lib/substances/opioid';
import { prescriptionContent } from '@/lib/substances/prescription';

// /llms-full.txt — the extended, full-text companion to /llms.txt.
//
// Where llms.txt is a concise link index, this file inlines the actual
// body copy so an AI system can ingest the substance of the site in a
// single fetch: the prose of every condition page (extracted from the
// shared SubstanceContent data objects — only the plain-string fields,
// never the JSX) and the full text of every published Recovery Roadmap
// article (real Markdown bodies pulled live from the blogs table, with
// blurb fallback for the static/legacy episodes whose copy lives in
// React components rather than the database).
//
// Served at /llms-full.txt; ISR-cached for an hour like the marketing
// pages. Best-effort throughout — a Supabase hiccup degrades to the
// static content rather than failing the route.

export const revalidate = 3600;

const ORIGIN = 'https://sevenarrowsrecoveryarizona.com';
const PHONE = '(866) 718-1665';

function abs(p: string): string {
  return `${ORIGIN}${p === '/' ? '' : p}`;
}

// The 9 templated condition pages, in the same order as the What We
// Treat list. (Cocaine and dual-diagnosis use bespoke layouts rather
// than the SubstanceContent template, so their copy is not extracted
// here; their JSON-LD + GeoAnswer blocks carry the machine-readable
// summary on-page.)
const SUBSTANCES: { label: string; route: string; content: SubstanceContent }[] = [
  { label: 'Alcohol Addiction', route: '/what-we-treat/alcohol-addiction', content: alcoholContent },
  { label: 'Benzodiazepine Addiction', route: '/what-we-treat/benzodiazepine', content: benzoContent },
  { label: 'Heroin Addiction', route: '/what-we-treat/heroin-addiction', content: heroinContent },
  { label: 'Inhalant Addiction', route: '/what-we-treat/inhalants', content: inhalantsContent },
  { label: 'Ketamine Addiction', route: '/what-we-treat/ketamine', content: ketamineContent },
  { label: 'Marijuana Addiction', route: '/what-we-treat/marijuana-addiction', content: marijuanaContent },
  { label: 'Methamphetamine Addiction', route: '/what-we-treat/methamphetamine', content: methContent },
  { label: 'Opioid Addiction', route: '/what-we-treat/opioid-addiction', content: opioidContent },
  { label: 'Prescription Drug Addiction', route: '/what-we-treat/prescription-drug-addiction', content: prescriptionContent },
];

// Pull the real prose out of a SubstanceContent object. Only the
// plain-string fields are read — the `title` ReactNodes are skipped
// entirely, so no JSX/className noise leaks into the text. Testimonial
// `voices` and the closing CTA are intentionally omitted (they are
// illustrative/marketing, not informational).
function substanceProse(c: SubstanceContent): string[] {
  const out: string[] = [];
  const push = (s?: string) => {
    const t = s?.trim();
    if (t) out.push(t);
  };

  push(c.hero.description);

  c.reward.paragraphs.forEach(push);
  c.cycle.paragraphs.forEach(push);

  push(c.body.body);
  for (const s of c.body.stats) push(`${s.value}${s.suffix ?? ''} — ${s.label}: ${s.body}`);
  if (c.body.footnote) push(c.body.footnote);

  push(c.withdrawal.body);
  for (const p of c.withdrawal.phases) push(`${p.label} (${p.days}): ${p.body}`);

  push(c.personas.body);
  for (const p of c.personas.personas) push(`${p.label} — ${p.headline}: ${p.body}`);

  push(c.approach.body);
  push(`${c.approach.flagship.title}: ${c.approach.flagship.body}`);
  for (const m of c.approach.modalities) push(`${m.title}: ${m.body}`);

  c.rewiring.paragraphs.forEach(push);

  return out;
}

// Full Markdown bodies for published, non-hidden blog posts, keyed by
// slug. Best-effort: returns an empty map on any failure.
async function blogBodies(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const { getAdminSupabase } = await import('@/lib/supabase-server');
    const admin = getAdminSupabase();
    const { data, error } = await admin
      .from('blogs')
      .select('slug, body_markdown, status')
      .eq('status', 'published');
    if (error || !data) return map;
    for (const row of data as Array<{ slug: string | null; body_markdown: string | null }>) {
      if (row.slug && row.body_markdown && row.body_markdown.trim()) {
        map.set(row.slug, row.body_markdown.trim());
      }
    }
  } catch {
    // Swallow — admin client unavailable in some preview contexts.
  }
  return map;
}

export async function GET(): Promise<Response> {
  const [episodes, bodies, hidden] = await Promise.all([
    getAllEpisodesNewestFirst().catch((): Episode[] => []),
    blogBodies(),
    getHiddenSlugs().catch((): Set<string> => new Set<string>()),
  ]);

  const lines: string[] = [];

  // Header + summary.
  lines.push(
    '# Seven Arrows Recovery — Full Text',
    '',
    `> Seven Arrows Recovery is a trauma-informed residential addiction and dual diagnosis treatment center on a 70-acre ranch in Elfrida, Arizona. Care combines evidence-based clinical therapy, equine-assisted therapy, somatic and holistic work, and indigenous healing traditions, with longer-than-average lengths of stay. Admissions are open 24/7 at ${PHONE}.`,
    '',
    `This is the extended, full-text companion to ${abs('/llms.txt')}. It inlines the body copy of the condition pages and the full text of published articles so an AI system can read the substance of the site in a single fetch. For the concise, link-only index, use ${abs('/llms.txt')}.`,
    '',
  );

  // About / program overview — canonical, hand-maintained prose.
  lines.push(
    '## About Seven Arrows Recovery',
    '',
    'Seven Arrows Recovery treats adults for substance use disorders and co-occurring mental-health conditions on a remote ranch in Cochise County, Arizona. The clinical model is salutogenic and trauma-first: rather than only managing symptoms, the program rebuilds self-leadership and treats the trauma that sits underneath both the addiction and any co-occurring condition.',
    '',
    'Treatment is integrated under one clinical team. Evidence-based psychotherapy (CBT, DBT, EMDR, IFS) is paired with Forward-Facing® Accelerated Recovery for trauma, medication management where clinically indicated, equine-assisted therapy, somatic and body-based work (breathwork, yoga, sound therapy), and indigenous and cultural healing traditions. Lengths of stay run longer than the industry-standard 30 days because sustained outcomes track with time in care.',
    '',
    `Admissions are open 24/7 at ${PHONE}. The program coordinates medically supervised detox through trusted partners, verifies insurance benefits, and builds a step-down aftercare plan into every discharge.`,
    '',
  );

  // Condition pages — extracted full prose.
  lines.push(
    '## What We Treat — Condition Pages (full copy)',
    '',
    `Each condition has a dedicated clinical page. The full body copy is inlined below; the live pages also carry FAQ and MedicalWebPage structured data. Overview: ${abs('/what-we-treat')}.`,
    '',
  );
  for (const s of SUBSTANCES) {
    lines.push(`### ${s.label}`, '', `URL: ${abs(s.route)}`, '');
    for (const para of substanceProse(s.content)) lines.push(para, '');
  }

  // Full articles.
  lines.push(
    '## Recovery Roadmap — Full Articles',
    '',
    `The complete article library, newest first. Posts with a database-backed body are inlined in full; legacy articles show a summary with a link to the full page. Index: ${abs('/who-we-are/recovery-roadmap')}.`,
    '',
  );
  const visible = episodes.filter((e) => !hidden.has(e.slug));
  for (const ep of visible) {
    const url = abs(episodeHref(ep.slug));
    lines.push(`### ${ep.title}`, '', `URL: ${url}`, `Published: ${ep.publishedDisplay}`, '');
    const body = bodies.get(ep.slug);
    if (body) {
      lines.push(body, '');
    } else if (ep.blurb) {
      lines.push(ep.blurb, '');
    }
  }

  const out = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

  return new Response(out, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
