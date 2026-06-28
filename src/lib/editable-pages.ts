// Sitemap + edit boundary for the Landing → Code editor.
//
// The Code tool may edit any PUBLIC website page — every route under
// src/app/(site) (its page.tsx / content.tsx) plus the landing-page
// section components in src/components/landing. It may NEVER edit the
// Feather app, the API routes, or shared libs. `isEditablePath` is that
// security boundary, enforced server-side on every proposed change.
//
// This module is pure (no server-only imports) so the client can reuse
// the label/grouping helpers; the registry is built from a repo file
// list the server fetches via the GitHub tree API.

export const LANDING_ROUTE = 'treatment/residential-inpatient';

const SITE_PAGE_RE = /^src\/app\/\(site\)\/(?:.+\/)?page\.tsx$/;
const SITE_EDITABLE_RE = /^src\/app\/\(site\)\/(?:.+\/)?(?:page|content)\.tsx$/;
const LANDING_COMPONENT_RE = /^src\/components\/landing\/[^/]+\.tsx$/;

// The one rule that gates every edit. Explicitly denies anything under
// Feather / api / lib even though the allow-patterns wouldn't match them
// — defense in depth against a bad proposed path.
export function isEditablePath(p: string): boolean {
  if (p.includes('/feather/') || p.startsWith('src/app/feather') || p.startsWith('src/app/api') || p.startsWith('src/lib')) {
    return false;
  }
  return SITE_EDITABLE_RE.test(p) || LANDING_COMPONENT_RE.test(p);
}

export interface EditablePage {
  key: string;       // route key, '' for home
  route: string;     // public path, e.g. /contact
  label: string;
  group: string;
  files: string[];   // source files this page maps to
}

function titleCase(seg: string): string {
  return seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function routeLabel(route: string): string {
  if (route === '') return 'Home';
  if (route === LANDING_ROUTE) return 'Landing (Residential Inpatient)';
  const last = route.split('/').pop() || route;
  return titleCase(last);
}

const MAIN_ROUTES = new Set(['', 'admissions', 'contact', 'tour', 'who-we-are', 'what-we-treat', 'our-program', 'treatment']);
const LEGAL_ROUTES = new Set(['terms', 'privacy-policy', 'unsubscribe']);

export function routeGroup(route: string): string {
  if (route === LANDING_ROUTE || route.startsWith('treatment/')) return 'Treatment';
  if (route.startsWith('our-program/')) return 'Our Program';
  if (route.startsWith('what-we-treat/')) return 'What We Treat';
  if (route === 'insurance' || route.startsWith('insurance/')) return 'Insurance';
  if (route.startsWith('locations/')) return 'Locations';
  if (LEGAL_ROUTES.has(route)) return 'Legal';
  if (MAIN_ROUTES.has(route)) return 'Main';
  return 'Blog';
}

export const GROUP_ORDER = ['Main', 'Treatment', 'Our Program', 'What We Treat', 'Insurance', 'Locations', 'Blog', 'Legal'];

// Friendly label for a changed source file (UI display).
export function fileLabel(path: string): string {
  if (LANDING_COMPONENT_RE.test(path)) return path.split('/').pop()!.replace(/\.tsx$/, '');
  if (SITE_EDITABLE_RE.test(path)) {
    const route = path.replace(/^src\/app\/\(site\)\//, '').replace(/\/?(?:page|content)\.tsx$/, '');
    const suffix = path.endsWith('content.tsx') ? ' (content)' : '';
    return routeLabel(route) + suffix;
  }
  return path.split('/').pop() || path;
}

// Build the page registry from a repo file list (blob paths). Each page
// maps to its page.tsx (+ content.tsx if present); the landing route also
// pulls in every landing section component.
export function buildEditablePages(paths: string[]): EditablePage[] {
  const set = new Set(paths);
  const landingComponents = paths.filter((p) => LANDING_COMPONENT_RE.test(p)).sort();
  const pages = paths
    .filter((p) => SITE_PAGE_RE.test(p))
    .map((pf) => {
      const route = pf.replace(/^src\/app\/\(site\)\//, '').replace(/\/?page\.tsx$/, '');
      const contentFile = pf.replace(/page\.tsx$/, 'content.tsx');
      const files = [pf];
      if (set.has(contentFile)) files.push(contentFile);
      if (route === LANDING_ROUTE) files.push(...landingComponents);
      return { key: route, route: `/${route}`, label: routeLabel(route), group: routeGroup(route), files };
    });
  pages.sort((a, b) => {
    const ga = GROUP_ORDER.indexOf(a.group);
    const gb = GROUP_ORDER.indexOf(b.group);
    if (ga !== gb) return ga - gb;
    return a.label.localeCompare(b.label);
  });
  return pages;
}
