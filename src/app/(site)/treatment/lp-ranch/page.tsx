import type { Metadata } from 'next';
import AdmissionsForm from '@/components/AdmissionsForm';
import StickyMobileCTA from '@/components/StickyMobileCTA';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Arizona's Ranch for Lasting Recovery | Seven Arrows Recovery",
  description:
    'Residential addiction & trauma treatment on a private 160-acre ranch in Arizona. Clinician-led equine therapy, 24/7 admissions, most major PPO plans. Call (866) 718-1665.',
  robots: { index: false, follow: false },
};

const PHONE_DISPLAY = '(866) 718-1665';
const PHONE_HREF = 'tel:+18667181665';

const HERO_IMG = '/hero/facility-exterior-mountains.jpg';
const HORSES_IMG = '/hero/horses-grazing.jpg';
const SOUND_IMG = '/hero/sound-healing-session.jpg';
const CEREMONY_IMG = '/images/campfire-ceremony-circle.webp';
const NIGHT_IMG = '/hero/sign-night-sky-milky-way.jpg';

const HERO_CHECKS = [
  '24/7 admissions · most clients arrive within 24–48 hours',
  'Trauma and addiction treated together, from day one',
  'Clinician-led equine therapy, ceremony, and small-census care',
  'JCAHO accredited · LegitScript certified · most major PPO plans',
];

const DIFFERENTIATORS = [
  {
    title: 'Trauma & addiction together',
    body: 'Both treated at once with our forward-facing TraumAddiction model, so you build on strengths instead of reliving the past.',
  },
  {
    title: 'Health, not just illness',
    body: 'The whole program is built around helping your nervous system feel safe. That regulation is the ground everything stands on.',
  },
  {
    title: "Equine therapy that's real therapy",
    body: 'Fifteen horses live here full-time, matched to you, in sessions led by licensed clinicians. Not horseback riding.',
  },
  {
    title: 'Indigenous ceremony with lineage',
    body: 'Founder Brian Twomoons and family (Crow Nation) hold the rights to share these ceremonies. Not religious; all are welcome.',
  },
  {
    title: 'A ranch, not a clinic',
    body: 'Mountain-view rooms, time outdoors with the horses, fresh locally sourced meals, and dark-sky nights.',
  },
  {
    title: 'Small by design',
    body: "Twenty beds and a high staff-to-client ratio. You're known here, not processed.",
  },
  {
    title: "You don't disappear after",
    body: 'Alumni community, weekly virtual groups, an annual reunion, and a 10-week family program.',
  },
  {
    title: 'Accredited & independently owned',
    body: 'JCAHO Gold Seal, LegitScript certified, HIPAA compliant. Not a private-equity chain.',
    highlight: true,
  },
];

const CARE = [
  {
    img: HERO_IMG,
    title: 'Residential Inpatient',
    body: '30, 60, and 90+ day immersive treatment with 24/7 on-site care, a primary therapist from day one, and 20+ hours of group weekly.',
  },
  {
    img: SOUND_IMG,
    title: 'Trauma & Dual Diagnosis',
    body: 'Forward-Facing® Accelerated Recovery with EMDR, IFS, ART, somatic CBT/DBT for co-occurring anxiety, depression, and PTSD.',
  },
  {
    img: HORSES_IMG,
    title: 'Family Program',
    body: 'A 10-week virtual family education program plus monthly individual family sessions, so your people understand what you\u2019re walking through.',
  },
  {
    img: NIGHT_IMG,
    title: 'Alumni & Aftercare',
    body: 'A structured alumni system with weekly peer groups, quarterly events, an annual reunion, and relapse-prevention support.',
  },
];

const CONDITIONS = [
  { title: 'Alcohol Addiction', body: 'Drinking that affects relationships, work, and health.' },
  { title: 'Opioid Addiction', body: 'Dependence on painkillers, heroin, or fentanyl.' },
  { title: 'Benzodiazepines', body: 'Misuse of medications like Xanax or Ativan.' },
  { title: 'Cocaine & Stimulants', body: 'Cocaine, meth, or prescription stimulant use.' },
  { title: 'Methamphetamine', body: 'Stimulant use that disrupts daily functioning.' },
  { title: 'Marijuana', body: 'Cannabis use that interferes with motivation and focus.' },
  { title: 'Prescription Drugs', body: 'Nonmedical use of sleep, ADHD, or pain medications.' },
  { title: 'Dual Diagnosis', body: 'Trauma, anxiety, depression, or PTSD alongside addiction.' },
];

const TEAM = [
  {
    img: SOUND_IMG,
    name: 'Lindsay Rothschild',
    role: 'LCSW · EMDRIA Certified — Clinical Director',
    body: 'Leads the clinical program with a trauma-focused, salutogenic approach grounded in EMDR and somatic work.',
  },
  {
    img: HERO_IMG,
    name: 'Tracey Oppenheim',
    role: 'MD — Medical Director',
    body: 'Oversees medical and dual-diagnosis care with a focus on safety, stabilization, and long-term wellness.',
  },
  {
    img: HORSES_IMG,
    name: 'Melissa Simard',
    role: 'LAC · CCTS-A — Equine Services Director',
    body: "Directs the equine-assisted psychotherapy program and matches each horse's temperament to the client.",
  },
  {
    img: CEREMONY_IMG,
    name: 'Brian Twomoons',
    role: 'Cultural Director',
    body: 'Of the Crow Nation, guides the ceremony and Indigenous-informed healing woven through the week.',
  },
];

const PAYERS = [
  'Aetna',
  'Anthem',
  'Blue Cross Blue Shield',
  'Cigna',
  'UnitedHealthcare',
  'Humana',
  'TRICARE',
  'Optum',
  'Carelon',
  'ComPsych',
];

const STEPS = [
  { n: 1, t: 'Minutes', title: 'Call', body: 'A real person answers 24/7, listens first, and walks you through next steps.' },
  { n: 2, t: '15–30 min', title: 'Verify insurance', body: 'A free, confidential benefits check with a plain-English summary.' },
  { n: 3, t: '20–30 min', title: 'Assessment', body: 'A brief clinical screen to build your personalized plan.' },
  { n: 4, t: 'Same day', title: 'Travel', body: 'Airport pickup at Tucson or Phoenix, or sober transport.' },
  { n: 5, t: '24–48 hrs', title: 'Arrive', body: "You're welcomed, oriented, and the clinical work begins." },
];

const TESTIMONIALS = [
  {
    quote:
      'Completely and totally changed my entire life. I cannot put into words what those 41 days did for me.',
    who: 'JESSICA C. · VERIFIED GOOGLE REVIEW',
  },
  {
    quote:
      "Incorporating equine therapy and Native American traditions, it's a departure from what you'd expect in an urban rehab.",
    who: 'JOSH · VERIFIED GOOGLE REVIEW',
  },
  {
    quote:
      "Seven Arrows saved my life. They are the reason I'm 2 years and 2 months sober.",
    who: 'KRISTIN G. · VERIFIED GOOGLE REVIEW',
  },
];

const STATS = [
  { b: '160', s: 'private acres' },
  { b: '20', s: 'beds · every client known by name' },
  { b: '15', s: 'horses in the equine program' },
  { b: '4.8★', s: 'Google rating · 28 reviews' },
];

const FAQS = [
  {
    q: 'How long is the program?',
    a: 'Most clients commit to 30, 60, or 90+ days, with length tailored to clinical need, especially for co-occurring conditions.',
  },
  {
    q: 'How fast can I be admitted?',
    a: 'Admissions answer 24/7, and most clients arrive on campus within 24–48 hours of the first call.',
  },
  {
    q: 'Do you take my insurance?',
    a: 'We work with most major PPO plans as an out-of-network provider, with single-case agreements available. Verify free above.',
  },
  {
    q: 'What makes Seven Arrows different?',
    a: 'Trauma and addiction treated together, clinician-led equine therapy, Indigenous ceremony, a 160-acre ranch, and a 20-bed small census.',
  },
  {
    q: 'Is family involved?',
    a: 'Yes. A 10-week virtual family program plus monthly individual family sessions are part of care.',
  },
];

function StarRow() {
  return (
    <span className="text-accent tracking-[2px]" aria-hidden>
      ★★★★★
    </span>
  );
}

export default function RanchLandingPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-dark-section text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMG}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              'linear-gradient(120deg, rgba(39,23,16,0.94) 0%, rgba(25,16,10,0.86) 60%)',
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-10 lg:gap-14 items-center">
            <div>
              <p className="inline-flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-accent mb-4">
                <span className="h-px w-6 bg-accent" />
                Residential Addiction &amp; Trauma Treatment · Arizona
              </p>
              <h1
                className="font-bold leading-[1.02] mb-4"
                style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 3.75rem)' }}
              >
                Recovery starts with{' '}
                <em className="not-italic" style={{ color: 'var(--color-accent)' }}>
                  one call
                </em>
                .
              </h1>
              <div className="flex items-center gap-3 mb-4 text-sm text-white/85">
                <StarRow /> 4.8/5 on Google · 28 verified reviews
              </div>
              <p className="text-lg text-white/85 max-w-xl mb-6" style={{ fontFamily: 'var(--font-body)' }}>
                Whether you or someone you love is struggling with addiction, help is available right
                now. A privately owned, trauma-focused treatment ranch on 160 acres. You don&rsquo;t
                have to face this alone.
              </p>
              <ul className="space-y-2.5 mb-2">
                {HERO_CHECKS.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-[15px] text-white/90">
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-green-700 text-white flex items-center justify-center text-[11px]">
                      ✓
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={PHONE_HREF}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-green-700 px-7 py-3.5 text-[15px] font-semibold text-white hover:brightness-110 transition"
                >
                  ✆ Call {PHONE_DISPLAY}
                </a>
                <a
                  href="#verify"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 px-7 py-3.5 text-[15px] font-semibold text-white hover:bg-white/10 transition"
                >
                  Verify My Insurance
                </a>
              </div>
              <p className="mt-6 text-[11px] tracking-[0.16em] uppercase text-white/45">
                JCAHO Accredited &nbsp;•&nbsp; LegitScript Certified &nbsp;•&nbsp; HIPAA Compliant
              </p>
            </div>

            {/* Lead form */}
            <div id="verify" className="scroll-mt-24">
              <div className="rounded-3xl bg-white text-foreground p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
                <h2
                  className="text-center text-xl font-bold"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Verify Your Insurance
                </h2>
                <p className="text-center text-[13px] text-foreground/60 mt-1 mb-5">
                  Confidential &amp; free · most major PPO plans
                </p>
                <AdmissionsForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAMPUS GALLERY */}
      <section className="bg-warm-bg py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-primary mb-3">
              The Ranch
            </p>
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Arizona&rsquo;s ranch for lasting recovery.
            </h2>
            <p className="mt-4 text-foreground/70 text-[17px]">
              Rustic-chic rooms with mountain views, a resident herd, ceremony space, and some of the
              clearest night skies in the country.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[180px]">
            {[
              { img: HERO_IMG, cap: 'The ranch at the base of the Swisshelm Mountains', big: true },
              { img: SOUND_IMG, cap: 'Sound · breath · body' },
              { img: HORSES_IMG, cap: 'The resident herd & arena' },
              { img: SOUND_IMG, cap: 'Comfortable indoor gathering spaces' },
              { img: CEREMONY_IMG, cap: 'Ceremony & connection' },
              { img: SOUND_IMG, cap: 'Quiet spaces for reflection' },
              { img: NIGHT_IMG, cap: 'Trails & dark-sky nights' },
            ].map((t, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-xl bg-dark-section ${
                  t.big ? 'col-span-2 row-span-2' : ''
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.img} alt={t.cap} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(transparent, rgba(20,12,7,0.82))' }}
                />
                <p
                  className="absolute left-0 right-0 bottom-0 p-3.5 text-white italic text-[15px]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {t.cap}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a
              href={PHONE_HREF}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-green-700 px-7 py-3.5 text-[15px] font-semibold text-white hover:brightness-110 transition"
            >
              ✆ Call {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>

      {/* DIFFERENTIATORS */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-primary mb-3">
              Why Seven Arrows
            </p>
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              What makes Seven Arrows different.
            </h2>
            <p className="mt-4 text-foreground/70 text-[17px]">
              A program designed to heal the whole person, not just manage symptoms.
            </p>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DIFFERENTIATORS.map((d) => (
              <div
                key={d.title}
                className={`rounded-2xl p-6 border ${
                  d.highlight
                    ? 'bg-primary border-primary text-white flex flex-col justify-center'
                    : 'bg-white border-black/8'
                }`}
              >
                {!d.highlight && (
                  <span className="block w-8 h-1 rounded-full bg-primary mb-4" aria-hidden />
                )}
                <h3
                  className={`text-xl font-bold mb-2 ${d.highlight ? 'text-white' : 'text-foreground'}`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {d.title}
                </h3>
                <p className={`text-[13.5px] ${d.highlight ? 'text-white/85' : 'text-foreground/70'}`}>
                  {d.body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a
              href={PHONE_HREF}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[15px] font-semibold text-white hover:brightness-110 transition"
            >
              Speak With Our Team
            </a>
          </div>
        </div>
      </section>

      {/* EQUINE SPOTLIGHT */}
      <section className="grid lg:grid-cols-2 bg-dark-section text-white">
        <div className="relative min-h-[360px] lg:min-h-[480px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HORSES_IMG} alt="The resident herd on the ranch" className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="p-8 sm:p-12 lg:p-16">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-dark-section bg-accent px-3 py-1.5 rounded-full mb-4">
            Our signature program
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Equine therapy that&rsquo;s{' '}
            <em className="not-italic" style={{ color: 'var(--color-accent)' }}>
              actual therapy
            </em>
            .
          </h2>
          <p className="text-white/80 text-[16px] mb-3.5">
            Equine therapy is our signature draw &mdash; and one of the most immersive equine
            experiences in the country. A lot of places offer horseback riding and call it healing.
            Here, fifteen horses live on the ranch full-time, each matched to you by temperament and
            assessed daily, in sessions led by licensed clinicians and built into your treatment plan.
          </p>
          <p className="text-white/80 text-[16px]">
            Horses respond to what you&rsquo;re really feeling underneath, and that honesty often
            reaches places talking can&rsquo;t.
          </p>
          <div className="flex flex-wrap gap-8 my-6">
            {[
              { b: '15', s: 'horses on the ranch' },
              { b: '1:1', s: 'clinician-led sessions' },
              { b: 'Daily', s: 'herd welfare checks' },
            ].map((m) => (
              <div key={m.s}>
                <b
                  className="block text-3xl font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}
                >
                  {m.b}
                </b>
                <span className="text-[12px] text-white/60">{m.s}</span>
              </div>
            ))}
          </div>
          <a
            href={PHONE_HREF}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[15px] font-semibold text-white hover:brightness-110 transition"
          >
            ✆ Call to learn more
          </a>
        </div>
      </section>

      {/* REASSURANCE BAND */}
      <section className="py-16 lg:py-20 text-center text-white" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="italic text-lg text-white/85 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Not sure recovery is really possible?
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            You don&rsquo;t have to face this alone.
          </h2>
          <p className="text-white/85 text-[17px] mb-6">
            Whether you&rsquo;re feeling lost, exhausted, or scared to take the first step, our
            admissions team meets you with compassion and care. Healing starts with a single call,
            and you don&rsquo;t have to make it on your own.
          </p>
          <a
            href={PHONE_HREF}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold text-primary-dark hover:brightness-95 transition"
          >
            ✆ Help is available — {PHONE_DISPLAY}
          </a>
        </div>
      </section>

      {/* LEVELS OF CARE */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-primary mb-3">
              Personalized Treatment
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Care built around the whole person.
            </h2>
            <p className="mt-4 text-foreground/70 text-[17px]">
              Trauma-focused residential treatment with the clinical depth of a hospital and the feel
              of a ranch.
            </p>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CARE.map((c) => (
              <div key={c.title} className="rounded-2xl overflow-hidden border border-black/8 bg-white">
                <div className="relative h-36">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.img} alt={c.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                    {c.title}
                  </h3>
                  <p className="text-[13.5px] text-foreground/70">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a
              href="#verify"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-foreground px-7 py-3.5 text-[15px] font-semibold text-foreground hover:bg-foreground hover:text-white transition"
            >
              Verify Your Insurance
            </a>
          </div>
        </div>
      </section>

      {/* WHAT WE TREAT */}
      <section className="bg-warm-bg py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-primary mb-3">
              What We Treat
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Help for what you&rsquo;re facing right now.
            </h2>
            <p className="mt-4 text-foreground/70 text-[17px]">
              Specialized care for substance use and co-occurring disorders.
            </p>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {CONDITIONS.map((c) => (
              <div key={c.title} className="flex items-start gap-3.5 rounded-xl border border-black/8 bg-white p-5">
                <span className="shrink-0 mt-1.5 w-2.5 h-2.5 rounded-full bg-primary" aria-hidden />
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground mb-1">{c.title}</h3>
                  <p className="text-[12.5px] text-foreground/70">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a
              href={PHONE_HREF}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-green-700 px-7 py-3.5 text-[15px] font-semibold text-white hover:brightness-110 transition"
            >
              ✆ We&rsquo;re here for you — {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-primary mb-3">
              Our Team
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              A team that understands recovery.
            </h2>
            <p className="mt-4 text-foreground/70 text-[17px]">
              Licensed clinicians and medical providers who bring expertise and lived experience to
              every step.
            </p>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEAM.map((m) => (
              <div key={m.name} className="rounded-2xl overflow-hidden border border-black/8 bg-white">
                <div className="relative h-52">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.img} alt={m.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                    {m.name}
                  </h3>
                  <p className="text-[12px] font-semibold text-primary my-2">{m.role}</p>
                  <p className="text-[13px] text-foreground/70">{m.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSURANCE */}
      <section className="bg-dark-section text-white py-16 lg:py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-accent mb-3">
            Insurance &amp; Payment
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            We work with most major PPO plans.
          </h2>
          <div className="mt-8 flex flex-wrap gap-3.5 justify-center">
            {PAYERS.map((p) => (
              <span
                key={p}
                className="bg-white text-foreground text-[14px] font-semibold px-5 py-3 rounded-lg min-w-[130px]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {p}
              </span>
            ))}
          </div>
          <div className="mt-8">
            <a
              href="#verify"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[15px] font-semibold text-white hover:brightness-110 transition"
            >
              Verify Insurance Coverage
            </a>
          </div>
          <p className="mt-6 text-[13px] text-white/60">
            Out-of-network provider with single-case agreements available. We do not bill Medicare or
            Medicaid.
          </p>
        </div>
      </section>

      {/* ADMISSIONS STEPS */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-primary mb-3">
              Admissions
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Five steps from first call to first day.
            </h2>
            <p className="mt-4 text-foreground/70 text-[17px]">
              We&rsquo;ve made it simple, so you can focus on getting help. Most clients arrive within
              24–48 hours.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto mb-3.5 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  {s.n}
                </div>
                <p className="text-[11px] tracking-[0.1em] uppercase text-primary font-semibold mb-1.5">{s.t}</p>
                <h3 className="text-lg font-bold text-foreground mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>
                  {s.title}
                </h3>
                <p className="text-[13px] text-foreground/70">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a
              href={PHONE_HREF}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-green-700 px-7 py-3.5 text-[15px] font-semibold text-white hover:brightness-110 transition"
            >
              ✆ Start admissions — {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-warm-bg py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-primary mb-3">
              Real Stories of Recovery
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              4.8 ★ from verified Google reviews.
            </h2>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.who} className="rounded-2xl border border-black/8 bg-white p-7">
                <div className="mb-3">
                  <StarRow />
                </div>
                <p className="text-lg leading-relaxed text-foreground mb-3.5" style={{ fontFamily: 'var(--font-display)' }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="text-[12.5px] font-semibold text-foreground/60 tracking-wide">{t.who}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 lg:py-20 text-center text-white" style={{ background: 'linear-gradient(135deg, #2f1d12, #693f25)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-accent mb-8">
            Small by design, serious about care
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.s}>
                <b className="block text-5xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}>
                  {s.b}
                </b>
                <span className="mt-1.5 block text-[13.5px] text-white/70">{s.s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCATION */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div className="relative min-h-[300px] rounded-2xl overflow-hidden border border-black/8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={NIGHT_IMG} alt="Seven Arrows Recovery under the night sky" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-primary mb-3">
                Location
              </p>
              <h3 className="text-2xl font-bold text-foreground mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>
                Seven Arrows Recovery
              </h3>
              <p className="text-foreground/70">
                2491 W Jefferson Rd, Elfrida, AZ 85610
                <br />
                Cochise County · base of the Swisshelm Mountains
              </p>
              <div className="flex flex-wrap gap-6 mt-5 text-[13px] text-foreground/70">
                <div>
                  <b className="block text-xl text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                    2h 15m
                  </b>
                  from Tucson (TUS)
                </div>
                <div>
                  <b className="block text-xl text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                    4h 00m
                  </b>
                  from Phoenix (PHX)
                </div>
              </div>
              <div className="mt-6">
                <a
                  href={PHONE_HREF}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[15px] font-semibold text-white hover:brightness-110 transition"
                >
                  Check Availability
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-warm-bg py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-primary mb-3">
              FAQ
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Questions, answered.
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-xl border border-black/8 bg-white p-5">
                <h3 className="flex justify-between gap-3.5 text-[15.5px] font-semibold text-foreground">
                  {f.q}
                  <span className="text-primary">＋</span>
                </h3>
                <p className="mt-2.5 text-[14px] text-foreground/70">{f.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a
              href={PHONE_HREF}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-green-700 px-7 py-3.5 text-[15px] font-semibold text-white hover:brightness-110 transition"
            >
              ✆ Still have questions? Call us
            </a>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-dark-section text-white py-16 lg:py-20 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Take the first step toward{' '}
            <em className="not-italic" style={{ color: 'var(--color-accent)' }}>
              the rest of your life
            </em>
            .
          </h2>
          <p className="text-white/70 text-[17px] mb-8">
            You don&rsquo;t have to struggle in silence. Reach out now and let us help you begin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={PHONE_HREF}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-green-700 px-7 py-3.5 text-[15px] font-semibold text-white hover:brightness-110 transition"
            >
              ✆ Call Now — {PHONE_DISPLAY}
            </a>
            <a
              href="#verify"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-3.5 text-[15px] font-semibold text-white hover:bg-white/10 transition"
            >
              Verify Insurance
            </a>
          </div>
        </div>
      </section>

      <StickyMobileCTA />
    </>
  );
}
