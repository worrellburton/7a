import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 47"
        title="What to Look for in a Heroin Rehab"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "What to Look for in a Heroin Rehab" },
        ]}
        description="Heroin addiction is a devastating disease that affects individuals and families across the country. If you or someone you love is struggling, finding the right treatment center is critical. Knowing what to look for in a heroin…"
        image="/hero/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              {"Heroin addiction is a devastating disease that affects individuals and families across the country. If you or someone you love is struggling, finding the right treatment center is critical. Knowing what to look for in a heroin rehab can help you choose a program that offers not only effective care but also long-term support for recovery. From medically supervised detox to personalized therapy, the best heroin rehab centers offer a comprehensive, compassionate approach that meets each individual’s unique needs."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Why Knowing What to Look for in a Heroin Rehab Matters"}
            </h2>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              {"Choosing a heroin rehab is not just about finding a place to stop using drugs; it’s about selecting a facility that will support lasting recovery. When evaluating what to look for in a heroin rehab or treatment center, several key elements should be considered. Understanding what to look for in a heroin rehab can help you make an informed decision that leads to long-term healing."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Look for facilities that are licensed and accredited, utilize evidence-based treatment models, and provide a comprehensive continuum of care. A quality program should treat not just the addiction but the underlying mental health and emotional issues that often contribute to heroin use."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Medical Detox Services"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"The first step in any effective heroin rehab program is medical detox. Heroin withdrawal can be extremely uncomfortable and, in some cases, dangerous. A reputable rehab center will offer or coordinate medically supervised detox to help manage withdrawal symptoms safely and comfortably. Ask whether the program offers 24/7 monitoring, access to medications like buprenorphine or methadone, and mental health support during detox."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"When considering what to look for in a heroin rehab, make sure detox is included as part of the treatment plan, not just a prerequisite. Seamless transition from detox to ongoing care is vital."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Evidence-Based Therapy Options at a Heroin Rehab in Arizona"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Once detox is complete, long-term treatment begins. One of the most important things to look for in a heroin rehab is access to evidence-based therapies that address both addiction and co-occurring disorders. The most effective programs use a combination of:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Cognitive Behavioral Therapy (CBT)"}</li>
              <li>{"Dialectical Behavior Therapy (DBT)"}</li>
              <li>{"Motivational Interviewing (MI)"}</li>
              <li>{"Trauma-informed care"}</li>
              <li>{"Group and family therapy"}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"These therapies help clients understand the root causes of their addiction, build coping strategies, and develop healthier patterns of thinking and behavior."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Individualized Treatment Plans"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Every person’s journey with addiction is different. That’s why individualized care is a major component of what to look for in a heroin rehab. Avoid one-size-fits-all programs. Instead, choose a rehab center that conducts thorough assessments at intake and develops a personalized treatment plan that evolves as recovery progresses."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Treatment plans should take into account a person’s history with substance use, mental health conditions, trauma background, medical needs, and personal goals. The best heroin rehab centers provide flexible, adaptive care that evolves with the individual."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Dual Diagnosis Support"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Many people struggling with heroin addiction also experience co-occurring mental health disorders, such as depression, anxiety, or PTSD. When evaluating what to look for in a heroin rehab, check whether the program offers dual diagnosis treatment."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Integrated care that addresses both substance use and mental health in tandem leads to better outcomes. Look for licensed clinicians, access to psychiatric medication, and specialized therapy designed to treat complex mental health challenges alongside addiction."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Holistic and Experiential Therapies"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"In addition to clinical therapy, many leading rehab centers include holistic or experiential therapies to support emotional and spiritual healing. When asking what to look for in a heroin rehab, consider programs that offer:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Yoga or meditation"}</li>
              <li>{"Art or music therapy"}</li>
              <li>{"Equine-assisted therapy"}</li>
              <li>{"Nature-based activities"}</li>
              <li>{"Mindfulness training"}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"These services may not be the core of treatment, but they provide valuable tools for stress reduction, self-awareness, and emotional regulation—key components of long-term recovery."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Aftercare and Relapse Prevention Planning"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"True recovery extends beyond the initial rehab stay. An essential part of what to look for in a heroin rehab is comprehensive aftercare planning. Before completing treatment, individuals should have access to:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Relapse prevention planning"}</li>
              <li>{"Ongoing outpatient or step-down care"}</li>
              <li>{"Alumni support groups"}</li>
              <li>{"Referrals to sober living"}</li>
              <li>{"Connection to community resources"}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Ask how the rehab supports clients after discharge and what kind of follow-up is available. Ongoing support significantly improves the chances of maintaining sobriety long-term."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Questions to Ask Before Choosing a Heroin Rehab"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"To ensure you’re choosing the right heroin rehab program, come prepared with questions. These can help you better understand the facility’s approach and whether it aligns with your or your loved one’s needs. Consider asking:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"What is your approach to treating heroin addiction?"}</li>
              <li>{"Do you offer or coordinate on-site medical detox?"}</li>
              <li>{"How do you develop individualized treatment plans?"}</li>
              <li>{"What evidence-based therapies do you provide?"}</li>
              <li>{"How do you support clients with dual diagnosis needs?"}</li>
              <li>{"What does your aftercare program include?"}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Having clear answers to these questions will help you confirm whether the facility meets your expectations."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Contact Seven Arrows Recovery for Heroin Rehab in Arizona"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Understanding what to look for in a heroin rehab is the first step toward finding real healing. At Seven Arrows Recovery in Arizona, we specialize in trauma-informed, individualized care for heroin addiction. Our programs combine medical detox, therapy, holistic healing, and long-term support to help clients break free from heroin and rebuild their lives with strength and purpose."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If you or a loved one is struggling with heroin addiction, don’t wait. Contact Seven Arrows Recovery today to learn more about our heroin rehab programs and how we can support you on the path to recovery."}
            </p>

            <div className="bg-warm-bg rounded-2xl p-8 lg:p-10 text-center mt-12">
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Start the Recovery Journey at Seven Arrows Recovery
              </h3>
              <p className="text-foreground/70 leading-relaxed mb-8 max-w-xl mx-auto">
                You don&rsquo;t have to walk this road alone. Our admissions team in Arizona is ready to listen, answer your questions, and help you find the next right step &mdash; whatever that looks like for you or your loved one.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="tel:8667181665" className="btn-primary">
                  Call (866) 718-1665
                </a>
                <Link href="/admissions" className="btn-outline">
                  Start Admissions
                </Link>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100">
              <p className="text-sm text-foreground/50 mb-4">
                <strong className="text-foreground/70">This is Episode 47 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
              </p>
              <Link
                href="/who-we-are/recovery-roadmap"
                className="group flex items-stretch gap-4 p-4 rounded-xl border border-primary/25 hover:border-primary/55 hover:shadow-lg transition-all duration-300 bg-white"
              >
                <div className="shrink-0 w-24 sm:w-32 aspect-[4/3] rounded-lg overflow-hidden bg-warm-bg flex items-center justify-center">
                  <svg className="w-10 h-10 text-primary/60" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <line x1="8" y1="14" x2="16" y2="14" />
                    <line x1="8" y1="17" x2="13" y2="17" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span
                    className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-1.5"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    The Series
                    <span className="w-5 h-px bg-primary/40" aria-hidden="true" />
                    All episodes
                  </span>
                  <p
                    className="text-foreground font-bold leading-snug group-hover:text-primary transition-colors"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}
                  >
                    The Recovery Roadmap &mdash; every episode in order
                  </p>
                  <span
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80 group-hover:text-primary transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Browse the full series
                    <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            </div>

          </div>
        </div>
      </article>
    </>
  );
}
