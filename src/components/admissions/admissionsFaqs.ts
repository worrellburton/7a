// Admissions FAQ corpus. Non-client module so the server page.tsx
// can import it for the FAQPage JSON-LD without pulling in the
// 'use client' bundle. Answers open with direct statements so LLMs
// can quote the first sentence as a standalone response.

export interface AdmissionsFaq {
  q: string;
  a: string;
}

export const admissionsFaqs: AdmissionsFaq[] = [
  {
    q: 'How do I start the admissions process?',
    a: 'Call (866) 996-4308 or submit the insurance-verification form. An admissions counselor runs a brief phone assessment, verifies your benefits, and schedules your arrival — most callers can be admitted within 24 to 48 hours.',
  },
  {
    q: 'Are admissions counselors available 24/7?',
    a: 'Yes. Admissions counselors answer the phone 24 hours a day, 7 days a week, every day of the year. Callers who reach voicemail outside of staffed hours get a callback within 15 minutes.',
  },
  {
    q: 'How long does insurance verification take?',
    a: 'Free insurance verification usually takes 15 to 30 minutes during business hours and under an hour outside them. We call the insurance carrier directly and return a plain-English summary of deductible, copay, and authorized days.',
  },
  {
    q: 'Which insurance plans do you accept?',
    a: 'Seven Arrows Recovery works with most major insurance plans — Aetna, Blue Cross Blue Shield, Cigna, UnitedHealthcare, Humana, TRICARE, and most PPO plans — as an out-of-network provider. Our admissions team runs a free benefits check so you know your coverage before you commit.',
  },
  {
    q: 'Do you accept Medicaid or Medicare?',
    a: 'Seven Arrows does not currently accept Medicaid or Medicare as primary insurance. Clients with Medicaid or Medicare coverage should call us anyway — we maintain a trusted-partner referral list and will help you find the right placement.',
  },
  {
    q: 'What if I do not have insurance?',
    a: 'We offer private-pay options and work with third-party medical-lending partners for clients who need to spread cost over time. Our admissions team walks through the full picture honestly on the first call.',
  },
  {
    q: 'Do I need to complete detox before admission?',
    a: 'We accept clients who are post-detox or who do not require medical detox. If you still need acute detoxification, admissions coordinates a short stay at a partnered detox facility so you arrive at Seven Arrows medically stable.',
  },
  {
    q: 'What should I bring to residential treatment?',
    a: 'Bring 7 to 10 days of comfortable clothing, sturdy closed-toe shoes, toiletries (alcohol-free), all prescribed medications in their original containers, a government-issued photo ID, and your insurance card. Admissions sends a full printable packing list with your confirmation.',
  },
  {
    q: 'What am I not allowed to bring?',
    a: 'Alcohol, drugs, or any substance (including alcohol-based mouthwash) are not allowed. Weapons, outside food or supplements without medical approval, clothing with drug/alcohol imagery, candles, and items of significant financial value are also held at intake.',
  },
  {
    q: 'How do I get to the ranch?',
    a: 'Most clients fly into Tucson International Airport (TUS, ~1 hour 45 minutes drive) or Phoenix Sky Harbor (PHX, ~3 hours). Our admissions team coordinates airport pickup, sober transport nationwide, or private driver service as needed.',
  },
  {
    q: 'Can my family call or visit while I am in treatment?',
    a: 'Yes. Structured phone check-ins with approved family members begin in the first week. Visitation is typically scheduled after the first two weeks; the clinical team handles visit scheduling and family-weekend logistics.',
  },
  {
    q: 'Is my admission confidential?',
    a: 'Yes. Seven Arrows is HIPAA-compliant and governed by 42 CFR Part 2, the federal confidentiality rule for substance-use treatment. Admissions never releases information without your signed authorization except where the law requires it.',
  },
];
