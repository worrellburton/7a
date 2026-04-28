// Per-slug meta description overrides for team-member detail pages.
// generateMetadata in src/app/(site)/who-we-are/meet-our-team/[slug]/page.tsx
// consults this map first, falling back to bio-truncate.
export const TEAM_META_DESCRIPTIONS: Record<string, string> = {
  'tracey-oppenheim':
    'Meet Tracey Oppenheim — clinician at Seven Arrows Recovery whose career spans childhood psychiatric care to psychedelic-assisted psychotherapy in Arizona.',
  'olivia-robinson':
    'Meet Olivia Robinson — Behavioral Health Tech and Recovery Support Specialist at Seven Arrows Recovery, also offering yoga and reiki for clients.',
  'donald-mackillop':
    'Meet Donald (Donny) MacKillop — Business Development at Seven Arrows Recovery, building relationships that connect families to the heart of our program.',
  'placida-valdez':
    "Meet Placida Valdez — Safety & Admissions Coordinator at Seven Arrows Recovery, ensuring a safe and welcoming environment from a client's first moment.",
  'adali-longnecker':
    'Meet Adali Longnecker — equine team member at Seven Arrows Recovery in Arizona, caring for the herd that supports clients through their recovery.',
  'pamela-calvo':
    'Meet Pamela Calvo — Program Director at Seven Arrows Recovery, overseeing daily operations to deliver safe, structured, and high-quality care in Arizona.',
  'allison-moye':
    'Meet Allison Moye — per diem trauma-informed therapist at Seven Arrows Recovery, supporting the clinical team and clients across the program.',
  'erin-roepcke':
    'Meet Erin Roepcke — clinician at Seven Arrows Recovery drawn to the human capacity not only to survive, but to thrive through addiction recovery.',
  'taylor-edington':
    "Meet Taylor Edington — Licensed Associate Counselor at Seven Arrows Recovery, leading experiential therapy in Arizona's high desert.",
  'lana-vansickle':
    'Meet Lana VanSickle — overnight staff at Seven Arrows Recovery, holding a safe and grounded space for residents during the quiet evening hours.',
  'erica-hawk':
    'Meet Erica Hawk — Equine Specialist at Seven Arrows Recovery, working alongside our equine therapist to support clients on their recovery journey.',
};
