// Shared FAQ content for Who We Help phase 9. Lives in a non-client
// module so the page.tsx server component can import it for the
// FAQPage JSON-LD schema without pulling in the 'use client' bundle.

export interface WhoFaq {
  q: string;
  a: string;
}

export const whoFaqs: WhoFaq[] = [
  {
    q: 'What age range does Seven Arrows Recovery treat?',
    a: 'Seven Arrows Recovery serves adults 18 and older. We do not currently treat adolescents; for clients under 18, our admissions team is glad to recommend trusted teen-focused partners.',
  },
  {
    q: 'Do you treat both substance use and mental health conditions?',
    a: 'Yes. Seven Arrows is a dual-diagnosis residential program, which means we treat substance use disorders alongside co-occurring mental health conditions — including anxiety, depression, PTSD, stabilized bipolar II, and OCD — in a single integrated plan of care.',
  },
  {
    q: 'Which substances do you treat?',
    a: 'We treat alcohol use disorder, opioid and heroin addiction (including fentanyl), prescription painkillers, methamphetamine, cocaine, benzodiazepines (Xanax, Klonopin), ketamine, inhalants, cannabis use disorder, and polysubstance use.',
  },
  {
    q: 'Do you accept clients who need medical detox first?',
    a: 'We accept clients who have completed medical detox or who do not require one. If you still need acute detox, our admissions team will coordinate a short stay at a partnered detox facility so that you arrive at Seven Arrows medically stable and ready to begin residential treatment.',
  },
  {
    q: 'How long is the typical stay?',
    a: 'Residential stays at Seven Arrows Recovery typically run 30, 60, or 90 days, with length of stay determined by clinical assessment, insurance authorization, and client needs. Many clients step down to outpatient or sober living after completing residential care.',
  },
  {
    q: 'Which insurance plans do you work with?',
    a: 'Seven Arrows works with most major insurance plans — Aetna, Blue Cross Blue Shield, Cigna, UnitedHealthcare, Humana, TRICARE, and most PPO plans — as an out-of-network provider. Our admissions team runs a free benefits verification, usually within 15 to 30 minutes.',
  },
  {
    q: 'Do you accept clients from outside Arizona?',
    a: 'Yes. We serve clients from across the United States. Most out-of-state clients fly into Tucson International Airport (TUS) or Phoenix Sky Harbor (PHX); our admissions team coordinates flight details and airport pickup directly.',
  },
  {
    q: 'Do you treat first responders and veterans?',
    a: 'Yes. Seven Arrows regularly treats police, fire, EMS, active-duty military, and veterans. We work with TRICARE as an out-of-network provider, and our TraumAddiction™ approach is specifically designed for trauma-impacted populations including first responders.',
  },
];
