// Client testimonials, tagged by the city region they came from
// so location pages can surface 2–3 quotes relevant to their
// audience without duplicating content across cities. Names are
// initialised + family relationship (where applicable) per the
// alumni-network privacy guidelines — no full names, no
// identifying photos.
//
// A testimonial may carry MULTIPLE regions (e.g. someone from
// Tempe whose family is in Scottsdale legitimately speaks to both
// audiences). Use `testimonialsForRegion(region)` to pull the
// best matches, capped at the requested count.

export type CityRegion = 'phoenix' | 'scottsdale' | 'tucson' | 'mesa' | 'general';

export interface Testimonial {
  /** Stable id so React keys and analytics references stay stable. */
  id: string;
  /** The quote itself — single paragraph, no leading/trailing quote marks. */
  quote: string;
  /** Display attribution. "S.M., Phoenix" / "J.R.'s mother, Mesa". */
  attribution: string;
  /** Regions this testimonial speaks to. Order is preference
   *  (first listed = primary region). */
  regions: CityRegion[];
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 't-phx-1',
    quote:
      "Pulling my son out of the Phoenix scene and getting him to the ranch was the hardest call I ever made. Three months later he came home — not the same kid, the better one I remember.",
    attribution: "M.K.'s mother, Phoenix",
    regions: ['phoenix'],
  },
  {
    id: 't-phx-2',
    quote:
      "I expected another corporate-feeling rehab. What I got was a 160-acre ranch, a horse named Diego, and the first clinicians who actually listened. The drive from Sky Harbor was the start of the work.",
    attribution: 'D.R., Phoenix',
    regions: ['phoenix', 'general'],
  },
  {
    id: 't-phx-3',
    quote:
      "Living in Glendale, I'd tried two outpatient programs in the Valley and one residential up the I-17. Seven Arrows was the only one that treated the trauma underneath the addiction. I'm 14 months sober.",
    attribution: 'A.S., West Valley',
    regions: ['phoenix'],
  },
  {
    id: 't-scott-1',
    quote:
      "Discretion mattered to our family. Seven Arrows handled the admission privately, transported my husband from our home in Scottsdale, and kept the family loop tight throughout. We have him back.",
    attribution: "Spouse of L.B., Scottsdale",
    regions: ['scottsdale'],
  },
  {
    id: 't-scott-2',
    quote:
      "I'd hit the wall in North Scottsdale — successful on paper, falling apart privately. The clinical depth at Seven Arrows met me where I was, and the equine work cracked something open I hadn't accessed in any other program.",
    attribution: 'K.W., Scottsdale',
    regions: ['scottsdale', 'general'],
  },
  {
    id: 't-scott-3',
    quote:
      "The boutique census is the difference. Twelve clients, not 200. Every clinician knew my name and my story by the second week. That is not the Scottsdale rehab experience I'd had before.",
    attribution: 'R.H., Paradise Valley',
    regions: ['scottsdale'],
  },
  {
    id: 't-mesa-1',
    quote:
      "Mesa to the ranch is a long drive, but it gave me time to make peace with the decision before I arrived. By the time I unpacked, I was ready.",
    attribution: 'B.T., Mesa',
    regions: ['mesa'],
  },
  {
    id: 't-tuc-1',
    quote:
      "Living in Tucson, the ranch was an hour away — close enough that my family could visit on weekends, far enough that I had real space to do the work.",
    attribution: "P.N., Tucson",
    regions: ['tucson'],
  },
  {
    id: 't-gen-1',
    quote:
      "The Forward-Facing® work and the daily contact with the horses changed how I show up — at home, at work, in my own head. Two years later it's still the foundation.",
    attribution: 'J.L., Arizona alum',
    regions: ['general'],
  },
];

/** Return the top `limit` testimonials that speak to the requested
 *  region. Pulls primary-region matches first, then secondary
 *  matches, then `general` quotes as filler so callers always get
 *  the count they asked for when at least that many testimonials
 *  exist in the library. */
export function testimonialsForRegion(region: CityRegion, limit = 3): Testimonial[] {
  const seen = new Set<string>();
  const out: Testimonial[] = [];
  // First pass — testimonials whose PRIMARY region matches.
  for (const t of TESTIMONIALS) {
    if (out.length >= limit) break;
    if (t.regions[0] === region && !seen.has(t.id)) {
      out.push(t);
      seen.add(t.id);
    }
  }
  // Second pass — testimonials that LIST the region (not primary).
  for (const t of TESTIMONIALS) {
    if (out.length >= limit) break;
    if (t.regions.includes(region) && !seen.has(t.id)) {
      out.push(t);
      seen.add(t.id);
    }
  }
  // Third pass — general-pool quotes as filler.
  for (const t of TESTIMONIALS) {
    if (out.length >= limit) break;
    if (t.regions.includes('general') && !seen.has(t.id)) {
      out.push(t);
      seen.add(t.id);
    }
  }
  return out;
}

export const TESTIMONIALS_LIBRARY = TESTIMONIALS;
