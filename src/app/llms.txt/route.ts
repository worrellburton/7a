import fs from 'node:fs';
import path from 'node:path';
import { getAllEpisodesNewestFirst, episodeHref, isEditorialEpisode, type Episode } from '@/lib/episodes';

// /llms.txt — a curated, machine-readable index of the site for large
// language models and AI answer engines (ChatGPT, Claude, Perplexity,
// Gemini, etc.), following the llmstxt.org convention.
//
// Why this exists: our marketing pages render as static/ISR HTML and
// already carry JSON-LD, but AI crawlers still have to guess which URLs
// matter and how the site is organised. llms.txt hands them a clean,
// prioritised map in Markdown — title, one-line summary, then sections
// of links with descriptions — so an assistant answering "best dual
// diagnosis rehab in Arizona" can find and cite the right page directly.
//
// Most of the file is generated, not hand-maintained: the page walk
// below reuses the same src/app/(site) enumeration as sitemap.ts, so a
// new condition or program page auto-includes here too, and the blog
// list is pulled live from the episodes index (static + DB-backed AI
// posts). Curated labels/descriptions live in the maps below; anything
// unlabelled falls back to a prettified slug.
//
// Served at /llms.txt because the folder is literally named "llms.txt".
// ISR-cached for an hour to match the marketing pages' freshness.

export const revalidate = 3600;

const ORIGIN = 'https://sevenarrowsrecoveryarizona.com';
const PHONE = '(866) 718-1665';

// ── Curated copy ──────────────────────────────────────────────
// One-line descriptions for the high-value navigation pages. Long-tail
// pages (individual conditions, carriers, locations) get a prettified
// label and no description — the label carries enough signal there.

const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/': 'Trauma-informed residential addiction and dual diagnosis treatment on a 160-acre ranch in Elfrida, Arizona — equine therapy, evidence-based clinical care, and indigenous healing traditions.',
  '/admissions': 'How to begin treatment: the admissions process, what to bring, what to expect on day one, and the 24/7 admissions line.',
  '/treatment': 'Overview of the levels of care and the clinical model — residential/inpatient, interventions, and aftercare.',
  '/our-program': 'The full therapeutic program: evidence-based therapies, holistic and somatic work, equine-assisted therapy, indigenous approaches, family program, and trauma treatment.',
  '/what-we-treat': 'The substances and co-occurring conditions treated at Seven Arrows, from alcohol and opioids to dual diagnosis.',
  '/who-we-are': 'Mission, clinical philosophy, the team, and why families choose Seven Arrows Recovery.',
  '/insurance': 'How insurance verification works, accepted carriers, and what addiction treatment typically costs.',
  '/contact': 'Phone, email, location, and the confidential admissions contact form.',
  '/tour': 'A visual tour of the ranch, residences, and therapeutic spaces.',
  '/who-we-are/our-philosophy': 'The salutogenic, trauma-informed philosophy behind the program — building on what is right, not only treating what is wrong.',
  '/who-we-are/why-us': 'What sets Seven Arrows apart: longer lengths of stay, integrated dual-diagnosis care, and a regulated clinical team.',
  '/who-we-are/faqs': 'Answers to the most common questions about treatment, length of stay, insurance, and daily life at the ranch.',
  '/who-we-are/meet-our-team': 'The clinicians, therapists, and staff who deliver care at Seven Arrows.',
  '/who-we-are/careers': 'Open roles and what it is like to work at Seven Arrows Recovery.',
  '/who-we-are/areas-we-serve': 'The Arizona communities Seven Arrows serves, and how travel-for-treatment works.',
  '/who-we-are/recovery-roadmap': 'The full Recovery Roadmap article series — long-form, clinically grounded writing on addiction and recovery.',
  '/who-we-are/blog': 'The Seven Arrows blog index — articles on recovery, treatment, and mental health.',
};

// Nicer labels for the auto-enumerated long-tail pages. Falls back to a
// prettified slug when a route is missing here.
const LABELS: Record<string, string> = {
  // /what-we-treat/*
  'alcohol-addiction': 'Alcohol Addiction',
  'benzodiazepine': 'Benzodiazepine Addiction',
  'cocaine': 'Cocaine Addiction',
  'dual-diagnosis': 'Dual Diagnosis (Co-Occurring Disorders)',
  'heroin-addiction': 'Heroin Addiction',
  'inhalants': 'Inhalant Addiction',
  'ketamine': 'Ketamine Addiction',
  'marijuana-addiction': 'Marijuana Addiction',
  'methamphetamine': 'Methamphetamine Addiction',
  'opioid-addiction': 'Opioid Addiction',
  'prescription-drug-addiction': 'Prescription Drug Addiction',
  // /our-program/*
  'equine-assisted': 'Equine-Assisted Therapy',
  'evidence-based': 'Evidence-Based Therapies',
  'family-program': 'Family Program',
  'holistic-approaches': 'Holistic Approaches',
  'indigenous-approach': 'Indigenous & Cultural Approach',
  'trauma-treatment': 'Trauma Treatment',
  'who-we-help': 'Who We Help',
  // /treatment/*
  'alumni-aftercare': 'Alumni & Aftercare',
  'interventions': 'Interventions',
  'residential-inpatient': 'Residential / Inpatient',
  'traumaddiction': 'Traumaddiction Model',
  // /insurance/*
  'aetna': 'Aetna',
  'blue-cross-blue-shield': 'Blue Cross Blue Shield',
  'cigna': 'Cigna',
  'humana': 'Humana',
  'tricare': 'TRICARE',
  'united-healthcare': 'UnitedHealthcare',
  // /locations/*
  'mesa': 'Mesa, AZ',
  'phoenix': 'Phoenix, AZ',
  'scottsdale': 'Scottsdale, AZ',
  'tucson': 'Tucson, AZ',
};

// ── Route enumeration (mirrors sitemap.ts) ────────────────────

function walkPages(dir: string, prefix: string, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  const hasPage = entries.some(
    (e) => e.isFile() && /^page\.(tsx|ts|jsx|js)$/.test(e.name),
  );
  if (hasPage) out.push(prefix === '' ? '/' : prefix);
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('(') && e.name.endsWith(')')) {
      walkPages(path.join(dir, e.name), prefix, out);
      continue;
    }
    if (e.name.startsWith('[') && e.name.endsWith(']')) continue;
    if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
    walkPages(path.join(dir, e.name), `${prefix}/${e.name}`, out);
  }
}

function prettify(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function labelFor(route: string): string {
  const slug = route.split('/').filter(Boolean).pop() ?? route;
  return LABELS[slug] ?? prettify(slug);
}

function abs(p: string): string {
  return `${ORIGIN}${p === '/' ? '' : p}`;
}

/** One Markdown list item: `- [Label](url): description` (description optional). */
function item(label: string, p: string, desc?: string): string {
  return `- [${label}](${abs(p)})${desc ? `: ${desc}` : ''}`;
}

/** Direct children of `parent` (one segment deeper), sorted, excluding the parent itself. */
function childrenOf(routes: string[], parent: string): string[] {
  const want = parent.split('/').filter(Boolean).length + 1;
  return routes
    .filter((r) => r.startsWith(`${parent}/`) && r.split('/').filter(Boolean).length === want)
    .sort();
}

export async function GET(): Promise<Response> {
  const siteRoot = path.join(process.cwd(), 'src', 'app', '(site)');
  const routes: string[] = [];
  walkPages(siteRoot, '', routes);
  routes.sort();

  // Blog posts — live from the episodes index (static + published AI
  // posts), newest first. Best-effort: a Supabase hiccup still yields
  // the static set. Featured = posts served under /who-we-are/blog/;
  // legacy root-level SEO articles drop into the Optional archive.
  let episodes: Episode[] = [];
  try {
    episodes = await getAllEpisodesNewestFirst();
  } catch {
    episodes = [];
  }
  // Editorial (Recovery Roadmap) posts are featured; the WordPress-era
  // SEO archive stays in Optional. The old "has no href" signal died
  // when every article moved to root-level URLs.
  const isFeatured = (e: Episode) => isEditorialEpisode(e);
  const featured = episodes.filter(isFeatured);
  const archive = episodes.filter((e) => !isFeatured(e));

  const lines: string[] = [];
  const section = (title: string, intro: string, items: string[]) => {
    lines.push(`## ${title}`, '');
    if (intro) lines.push(intro, '');
    lines.push(...items, '');
  };

  // Header + summary blockquote.
  lines.push(
    '# Seven Arrows Recovery',
    '',
    `> Seven Arrows Recovery is a trauma-informed residential addiction and dual diagnosis treatment center on a 160-acre ranch in Elfrida, Arizona. Care combines evidence-based clinical therapy, equine-assisted therapy, somatic and holistic work, and indigenous healing traditions, with longer-than-average lengths of stay. Admissions are open 24/7 at ${PHONE}.`,
    '',
    'Seven Arrows treats adults for substance use disorders and co-occurring mental-health conditions. The program is salutogenic and trauma-first: rather than only managing symptoms, it rebuilds self-leadership and treats the trauma underneath both the addiction and the mental-health condition. The pages below are the canonical, citable sources for our program, the conditions we treat, admissions and insurance, locations, and our editorial library.',
    '',
    `For full inlined body copy of the condition pages and the complete text of every published article, see ${abs('/llms-full.txt')}.`,
    '',
  );

  // Core pages.
  section(
    'Core Pages',
    'Start here — the primary entry points to the site.',
    [
      item('Home', '/', PAGE_DESCRIPTIONS['/']),
      item('Admissions', '/admissions', PAGE_DESCRIPTIONS['/admissions']),
      item('Our Program', '/our-program', PAGE_DESCRIPTIONS['/our-program']),
      item('What We Treat', '/what-we-treat', PAGE_DESCRIPTIONS['/what-we-treat']),
      item('Who We Are', '/who-we-are', PAGE_DESCRIPTIONS['/who-we-are']),
      item('Insurance & Payment', '/insurance', PAGE_DESCRIPTIONS['/insurance']),
      item('Contact', '/contact', PAGE_DESCRIPTIONS['/contact']),
      item('Tour the Ranch', '/tour', PAGE_DESCRIPTIONS['/tour']),
    ],
  );

  // What we treat — auto-enumerated condition pages.
  section(
    'What We Treat',
    'Substance use disorders and co-occurring conditions, each with a dedicated clinical page.',
    [
      item('What We Treat — overview', '/what-we-treat', PAGE_DESCRIPTIONS['/what-we-treat']),
      ...childrenOf(routes, '/what-we-treat').map((r) => item(labelFor(r), r)),
    ],
  );

  // Program + levels of care.
  section(
    'Our Program & Levels of Care',
    'The therapeutic approach and the levels of care offered.',
    [
      item('Our Program — overview', '/our-program', PAGE_DESCRIPTIONS['/our-program']),
      ...childrenOf(routes, '/our-program').map((r) => item(labelFor(r), r)),
      item('Treatment — overview', '/treatment', PAGE_DESCRIPTIONS['/treatment']),
      ...childrenOf(routes, '/treatment').map((r) => item(labelFor(r), r)),
    ],
  );

  // Admissions & insurance.
  section(
    'Admissions & Insurance',
    `Begin treatment or verify benefits. Admissions line: ${PHONE} (24/7).`,
    [
      item('Admissions', '/admissions', PAGE_DESCRIPTIONS['/admissions']),
      item('Insurance & Payment', '/insurance', PAGE_DESCRIPTIONS['/insurance']),
      ...childrenOf(routes, '/insurance').map((r) => item(`${labelFor(r)} coverage`, r)),
    ],
  );

  // Locations.
  const locationItems = [
    ...childrenOf(routes, '/locations').map((r) => item(labelFor(r), r)),
  ];
  if (routes.includes('/who-we-are/areas-we-serve')) {
    locationItems.push(item('Areas We Serve', '/who-we-are/areas-we-serve', PAGE_DESCRIPTIONS['/who-we-are/areas-we-serve']));
  }
  section(
    'Locations',
    'Seven Arrows is located in Elfrida, Arizona, and serves clients across the state.',
    locationItems,
  );

  // Who we are.
  section(
    'Who We Are',
    'The philosophy, the people, and the proof behind the program.',
    [
      item('Who We Are — overview', '/who-we-are', PAGE_DESCRIPTIONS['/who-we-are']),
      item('Our Philosophy', '/who-we-are/our-philosophy', PAGE_DESCRIPTIONS['/who-we-are/our-philosophy']),
      item('Why Seven Arrows', '/who-we-are/why-us', PAGE_DESCRIPTIONS['/who-we-are/why-us']),
      item('Meet Our Team', '/who-we-are/meet-our-team', PAGE_DESCRIPTIONS['/who-we-are/meet-our-team']),
      item('FAQs', '/who-we-are/faqs', PAGE_DESCRIPTIONS['/who-we-are/faqs']),
      item('Careers', '/who-we-are/careers', PAGE_DESCRIPTIONS['/who-we-are/careers']),
    ],
  );

  // Featured blog.
  section(
    'Recovery Roadmap (Featured Articles)',
    'Long-form, clinically grounded writing on addiction, trauma, and recovery. Full index at ' + abs('/who-we-are/recovery-roadmap') + '.',
    featured.length
      ? featured.map((e) => item(e.title, episodeHref(e.slug), e.blurb))
      : [item('Recovery Roadmap — article series', '/who-we-are/recovery-roadmap', PAGE_DESCRIPTIONS['/who-we-are/recovery-roadmap'])],
  );

  // Legal / utility.
  section(
    'Legal',
    '',
    [
      item('Privacy Policy', '/privacy-policy'),
      item('Terms of Use', '/terms'),
    ],
  );

  // Optional — the legacy article archive. LLMs with limited context can
  // skip this section; it is the long tail of SEO-era articles served at
  // their original root-level URLs.
  if (archive.length) {
    section(
      'Optional',
      'Archived articles from the Seven Arrows library. Secondary reference — skip if context is limited.',
      archive.map((e) => item(e.title, episodeHref(e.slug), e.blurb)),
    );
  }

  const body = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
