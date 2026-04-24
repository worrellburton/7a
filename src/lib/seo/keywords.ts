// Curated keyword research set for Seven Arrows Recovery.
//
// This is a hand-curated list of high-intent keywords the admissions
// funnel actually depends on — location + modality + insurance + substance
// + brand + decision queries — with directional monthly search volumes
// (US) and difficulty estimates.
//
// ⚠️ Volumes and difficulty are STRUCTURED ESTIMATES, not live data.
// Live keyword volume requires a paid API (Semrush / Ahrefs / DataForSEO).
// Numbers here are pulled from published industry benchmarks + Google
// Keyword Planner ranges and should be treated as directional. When a
// SerpAPI-based rank lookup runs (phase 2 below), the *rank* field
// becomes live; the *volume* and *difficulty* fields remain curated
// until / unless we wire up a paid volume API.

export type KeywordCategory =
  | 'location'
  | 'modality'
  | 'insurance'
  | 'substance'
  | 'brand'
  | 'decision';

export type KeywordDifficulty = 'low' | 'medium' | 'high';

export interface Keyword {
  id: string;
  text: string;
  category: KeywordCategory;
  /** Approximate US monthly search volume (structured estimate). */
  volume: number;
  /** SEO difficulty (how hard to rank top-10) — low / medium / high. */
  difficulty: KeywordDifficulty;
  /** Admissions-funnel priority: 1 = must-win, 3 = nice-to-have. */
  priority: 1 | 2 | 3;
  /** Optional note explaining why this keyword matters. */
  note?: string;
}

export const CATEGORY_LABELS: Record<KeywordCategory, string> = {
  location: 'Location / intent',
  modality: 'Modalities',
  insurance: 'Insurance',
  substance: 'Substance-specific',
  brand: 'Brand',
  decision: 'Decision / informational',
};

export const KEYWORDS: Keyword[] = [
  // ---- Location / intent (highest admissions value) ----
  { id: 'loc-01', text: 'drug rehab arizona', category: 'location', volume: 3600, difficulty: 'high', priority: 1 },
  { id: 'loc-02', text: 'rehab in arizona', category: 'location', volume: 2900, difficulty: 'high', priority: 1 },
  { id: 'loc-03', text: 'rehab in phoenix', category: 'location', volume: 2400, difficulty: 'high', priority: 1 },
  { id: 'loc-04', text: 'arizona rehab centers', category: 'location', volume: 1900, difficulty: 'high', priority: 1 },
  { id: 'loc-05', text: 'best rehab in arizona', category: 'location', volume: 880, difficulty: 'high', priority: 1 },
  { id: 'loc-06', text: 'rehab in scottsdale', category: 'location', volume: 720, difficulty: 'medium', priority: 1 },
  { id: 'loc-07', text: 'scottsdale rehab', category: 'location', volume: 590, difficulty: 'medium', priority: 2 },
  { id: 'loc-08', text: 'luxury rehab arizona', category: 'location', volume: 480, difficulty: 'medium', priority: 2 },
  { id: 'loc-09', text: 'phoenix rehab center', category: 'location', volume: 1000, difficulty: 'high', priority: 2 },
  { id: 'loc-10', text: 'residential treatment arizona', category: 'location', volume: 260, difficulty: 'medium', priority: 2 },

  // ---- Modality (differentiators we can own) ----
  { id: 'mod-01', text: 'equine therapy', category: 'modality', volume: 14000, difficulty: 'medium', priority: 1, note: 'High volume head term — target with a long-form page.' },
  { id: 'mod-02', text: 'equine therapy rehab', category: 'modality', volume: 390, difficulty: 'low', priority: 1 },
  { id: 'mod-03', text: 'drug rehabs with horses', category: 'modality', volume: 320, difficulty: 'low', priority: 1 },
  { id: 'mod-04', text: 'trauma informed rehab', category: 'modality', volume: 720, difficulty: 'medium', priority: 1 },
  { id: 'mod-05', text: 'trauma informed addiction treatment', category: 'modality', volume: 210, difficulty: 'low', priority: 1 },
  { id: 'mod-06', text: 'dual diagnosis treatment arizona', category: 'modality', volume: 170, difficulty: 'low', priority: 2 },
  { id: 'mod-07', text: 'holistic rehab arizona', category: 'modality', volume: 260, difficulty: 'low', priority: 2 },
  { id: 'mod-08', text: 'indigenous recovery programs', category: 'modality', volume: 90, difficulty: 'low', priority: 2 },

  // ---- Insurance (critical funnel unlock) ----
  { id: 'ins-01', text: 'rehabs that accept aetna', category: 'insurance', volume: 880, difficulty: 'medium', priority: 1 },
  { id: 'ins-02', text: 'rehabs that accept blue cross blue shield', category: 'insurance', volume: 590, difficulty: 'medium', priority: 1 },
  { id: 'ins-03', text: 'rehabs that accept tricare', category: 'insurance', volume: 720, difficulty: 'medium', priority: 1 },
  { id: 'ins-04', text: 'rehabs that accept cigna', category: 'insurance', volume: 720, difficulty: 'medium', priority: 1 },
  { id: 'ins-05', text: 'rehabs that accept united healthcare', category: 'insurance', volume: 590, difficulty: 'medium', priority: 2 },
  { id: 'ins-06', text: 'rehabs that accept humana', category: 'insurance', volume: 320, difficulty: 'low', priority: 2 },
  { id: 'ins-07', text: 'does insurance cover rehab', category: 'insurance', volume: 2400, difficulty: 'high', priority: 2 },

  // ---- Substance-specific ----
  { id: 'sub-01', text: 'alcohol rehab arizona', category: 'substance', volume: 720, difficulty: 'medium', priority: 1 },
  { id: 'sub-02', text: 'opioid treatment arizona', category: 'substance', volume: 260, difficulty: 'low', priority: 2 },
  { id: 'sub-03', text: 'meth rehab arizona', category: 'substance', volume: 170, difficulty: 'low', priority: 2 },
  { id: 'sub-04', text: 'cocaine rehab arizona', category: 'substance', volume: 90, difficulty: 'low', priority: 2 },
  { id: 'sub-05', text: 'benzo detox arizona', category: 'substance', volume: 50, difficulty: 'low', priority: 3 },
  { id: 'sub-06', text: 'fentanyl rehab arizona', category: 'substance', volume: 140, difficulty: 'low', priority: 2 },

  // ---- Brand (we should always be #1) ----
  { id: 'brand-01', text: 'seven arrows recovery', category: 'brand', volume: 140, difficulty: 'low', priority: 1 },
  { id: 'brand-02', text: 'seven arrows arizona', category: 'brand', volume: 20, difficulty: 'low', priority: 1 },
  { id: 'brand-03', text: 'seven arrows recovery reviews', category: 'brand', volume: 30, difficulty: 'low', priority: 1 },

  // ---- Decision / informational ----
  { id: 'dec-01', text: 'how much does rehab cost', category: 'decision', volume: 14800, difficulty: 'high', priority: 2 },
  { id: 'dec-02', text: 'how long is rehab', category: 'decision', volume: 9900, difficulty: 'high', priority: 2 },
  { id: 'dec-03', text: 'what to expect in rehab', category: 'decision', volume: 4400, difficulty: 'high', priority: 3 },
  { id: 'dec-04', text: 'intervention for addiction', category: 'decision', volume: 2900, difficulty: 'high', priority: 2 },
  { id: 'dec-05', text: 'signs someone needs rehab', category: 'decision', volume: 880, difficulty: 'medium', priority: 3 },
  { id: 'dec-06', text: 'how to choose a rehab', category: 'decision', volume: 720, difficulty: 'medium', priority: 2 },
];

export function keywordsByCategory(
  keywords: Keyword[] = KEYWORDS,
): Record<KeywordCategory, Keyword[]> {
  const out: Record<KeywordCategory, Keyword[]> = {
    location: [],
    modality: [],
    insurance: [],
    substance: [],
    brand: [],
    decision: [],
  };
  for (const k of keywords) out[k.category].push(k);
  return out;
}

/** Total addressable monthly search volume across the full set. */
export function totalVolume(keywords: Keyword[] = KEYWORDS): number {
  return keywords.reduce((s, k) => s + k.volume, 0);
}
