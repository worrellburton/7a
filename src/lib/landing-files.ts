// The set of source files the Landing → Code editor is allowed to
// touch. This is the security boundary for the feature: the API route
// rejects any edit whose path is not in this list, so Claude can only
// ever change the public landing page — never an arbitrary repo file.
//
// Keep this in sync with what assembles the /treatment/residential-inpatient
// landing page (the page file + every section component it renders).
export const LANDING_EDITABLE_FILES = [
  'src/app/(site)/treatment/residential-inpatient/page.tsx',
  'src/components/landing/LandingHero.tsx',
  'src/components/landing/ProofBand.tsx',
  'src/components/landing/TrustRibbon.tsx',
  'src/components/landing/Differentiator.tsx',
  'src/components/landing/PersonaSplitter.tsx',
  'src/components/landing/PersonaContext.tsx',
  'src/components/landing/PersonaFAQ.tsx',
  'src/components/landing/InsuranceTransparency.tsx',
  'src/components/landing/CampusMap.tsx',
  'src/components/landing/DayAtRanch.tsx',
  'src/components/landing/LandingClose.tsx',
  'src/components/landing/ExitIntentModal.tsx',
] as const;

export type LandingEditableFile = (typeof LANDING_EDITABLE_FILES)[number];

export function isLandingEditableFile(path: string): boolean {
  return (LANDING_EDITABLE_FILES as readonly string[]).includes(path);
}

// Friendly label for the UI checklist — strips the directory and the
// .tsx extension so "src/components/landing/LandingHero.tsx" reads as
// "LandingHero", and the page file reads as "Page (residential-inpatient)".
export function landingFileLabel(path: string): string {
  if (path.endsWith('/page.tsx')) return 'Page (residential-inpatient)';
  const base = path.split('/').pop() ?? path;
  return base.replace(/\.tsx$/, '');
}
