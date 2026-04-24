// Default prompt set for the GEO audit.
//
// These are the queries the admissions funnel actually depends on —
// what a prospective client (or their family) would type into an AI
// answer engine when researching treatment. Grouped by category so
// the audit can score coverage per funnel stage.
//
// Each prompt carries:
//   - category  – used to group in the UI + compute per-category scores
//   - priority  – 1 (highest) → 3 (lowest); weights the scorer
//   - competitorWatch – optional list of brand names we explicitly want
//     to flag when an answer cites them instead of (or alongside) us
//
// The list is intentionally opinionated: it reflects the queries we
// want Seven Arrows to win, not a neutral snapshot of search volume.
// Operators can edit this file (or override via a future admin UI) to
// tune what the audit cares about.

export type PromptCategory =
  | 'location_intent'
  | 'modality'
  | 'insurance'
  | 'substance'
  | 'brand'
  | 'decision';

export interface GeoPrompt {
  id: string;
  text: string;
  category: PromptCategory;
  priority: 1 | 2 | 3;
  competitorWatch?: string[];
}

// Arizona competitors we explicitly want to surface when they appear
// in an AI answer to one of our target prompts. Not exhaustive — feel
// free to extend.
export const COMPETITOR_BRANDS = [
  'Sierra Tucson',
  'The Meadows',
  'Brighton Center for Recovery',
  'Cottonwood Tucson',
  'Desert Cove Recovery',
  'Decision Point Center',
  'Spring Ridge Academy',
  'Valley Hope',
];

export const DEFAULT_PROMPTS: GeoPrompt[] = [
  // ---- Location / intent (highest admissions value) ----
  { id: 'loc-01', text: 'Best rehab in Arizona', category: 'location_intent', priority: 1, competitorWatch: COMPETITOR_BRANDS },
  { id: 'loc-02', text: 'Best luxury rehab in Arizona', category: 'location_intent', priority: 1, competitorWatch: COMPETITOR_BRANDS },
  { id: 'loc-03', text: 'Trauma-informed rehab in Arizona', category: 'location_intent', priority: 1, competitorWatch: COMPETITOR_BRANDS },
  { id: 'loc-04', text: 'Residential addiction treatment near Scottsdale', category: 'location_intent', priority: 1 },
  { id: 'loc-05', text: 'Top-rated drug rehab in Phoenix', category: 'location_intent', priority: 2 },
  { id: 'loc-06', text: 'Rehabs with outdoor therapy in the Southwest', category: 'location_intent', priority: 2 },

  // ---- Modality (our differentiators) ----
  { id: 'mod-01', text: 'Rehabs with equine therapy', category: 'modality', priority: 1 },
  { id: 'mod-02', text: 'Drug rehabs with horses', category: 'modality', priority: 1 },
  { id: 'mod-03', text: 'Rehabs that treat trauma and addiction together', category: 'modality', priority: 1 },
  { id: 'mod-04', text: 'Dual diagnosis treatment centers in Arizona', category: 'modality', priority: 2 },
  { id: 'mod-05', text: 'Rehabs that use indigenous or holistic practices', category: 'modality', priority: 2 },
  { id: 'mod-06', text: 'Best rehab for post-traumatic growth', category: 'modality', priority: 3 },

  // ---- Insurance (critical funnel unlocker) ----
  { id: 'ins-01', text: 'Rehabs in Arizona that accept Aetna', category: 'insurance', priority: 1 },
  { id: 'ins-02', text: 'Rehabs in Arizona that accept Blue Cross Blue Shield', category: 'insurance', priority: 1 },
  { id: 'ins-03', text: 'Rehabs in Arizona that accept Cigna', category: 'insurance', priority: 2 },
  { id: 'ins-04', text: 'Rehabs that accept Tricare in Arizona', category: 'insurance', priority: 2 },
  { id: 'ins-05', text: 'Rehabs that accept United Healthcare in Arizona', category: 'insurance', priority: 2 },
  { id: 'ins-06', text: 'Rehabs in Arizona that accept Humana', category: 'insurance', priority: 3 },

  // ---- Substance-specific ----
  { id: 'sub-01', text: 'Alcohol rehab in Arizona', category: 'substance', priority: 1 },
  { id: 'sub-02', text: 'Opioid treatment center Arizona', category: 'substance', priority: 1 },
  { id: 'sub-03', text: 'Benzodiazepine detox in Arizona', category: 'substance', priority: 2 },
  { id: 'sub-04', text: 'Methamphetamine rehab in Arizona', category: 'substance', priority: 2 },
  { id: 'sub-05', text: 'Cocaine addiction treatment Arizona', category: 'substance', priority: 2 },

  // ---- Brand (should always mention us) ----
  { id: 'brand-01', text: 'Seven Arrows Recovery reviews', category: 'brand', priority: 1 },
  { id: 'brand-02', text: 'Is Seven Arrows Recovery legitimate?', category: 'brand', priority: 1 },
  { id: 'brand-03', text: 'Seven Arrows Recovery Arizona programs and cost', category: 'brand', priority: 1 },
  { id: 'brand-04', text: 'Seven Arrows Recovery vs other Arizona rehabs', category: 'brand', priority: 2 },

  // ---- Decision / comparison ----
  { id: 'dec-01', text: 'How to choose a trauma-informed rehab', category: 'decision', priority: 2 },
  { id: 'dec-02', text: 'What should I look for in a residential addiction treatment center?', category: 'decision', priority: 2 },
  { id: 'dec-03', text: 'How long should inpatient rehab last?', category: 'decision', priority: 3 },
  { id: 'dec-04', text: 'What does luxury rehab in Arizona cost?', category: 'decision', priority: 3 },
];

export const CATEGORY_LABELS: Record<PromptCategory, string> = {
  location_intent: 'Location / intent',
  modality: 'Modalities',
  insurance: 'Insurance',
  substance: 'Substance-specific',
  brand: 'Brand queries',
  decision: 'Decision / comparison',
};

export function categoryCount(prompts: GeoPrompt[] = DEFAULT_PROMPTS): Record<PromptCategory, number> {
  const counts = {
    location_intent: 0,
    modality: 0,
    insurance: 0,
    substance: 0,
    brand: 0,
    decision: 0,
  } satisfies Record<PromptCategory, number>;
  for (const p of prompts) counts[p.category] += 1;
  return counts;
}
