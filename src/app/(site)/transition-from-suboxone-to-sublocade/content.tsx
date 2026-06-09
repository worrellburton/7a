import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 7"
        title="Transitioning from Suboxone to Sublocade"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: 'Transitioning from Suboxone to Sublocade' },
        ]}
        description="What to expect when switching from daily Suboxone to a monthly Sublocade injection — eligibility, the timing, insurance coverage, and how our Arizona team walks alongside you the whole way."
        image="/hero/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              At Seven Arrows Recovery, we know addiction treatment is not always easy. It takes courage to make positive changes in your recovery process, but we&rsquo;re here to help. If you&rsquo;re using Suboxone and want to know more about your options for transitioning to Sublocade, you&rsquo;ve come to the right place. Sublocade is a unique and effective way to treat opioid addiction and could be the next step you need in your recovery. It&rsquo;s a great way to make medication management easy while also offering long-term stability during the tapering process.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              In this guide, we&rsquo;ll discuss what to expect during the transition from Suboxone to Sublocade, why this treatment can help you taper off MAT more easily, review insurance coverage, and learn how Seven Arrows Recovery in Arizona can help you every step of the way.
            </p>

            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Suboxone: What Is It and Why You May Need to Transition
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Suboxone is a medication-assisted treatment (MAT) program used to help those in recovery from opioid use disorder. This combination of buprenorphine and naloxone works to control withdrawal symptoms and manage cravings, making it a safe and effective method for those struggling with addiction to opioids. While Suboxone can be helpful in many situations, individuals using it for an extended period may find that it&rsquo;s challenging to get off or that they need a more convenient, long-term solution with less potential for abuse.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Transitioning to Sublocade can be the ideal next step for individuals seeking a more effective treatment option. Approved by the FDA for the treatment of moderate-to-severe opioid use disorder, Sublocade is an extended-release, injectable form of buprenorphine. This treatment option differs significantly from Suboxone and may be a more convenient way to receive the same care. While Suboxone is typically taken daily as a film or tablet under the tongue, Sublocade is a monthly injection. Injections are administered by a medical professional and help you maintain a consistent level of medication in the body. This can lead to greater treatment adherence and less frequent cravings.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              Transitioning to Sublocade can change how you manage your MAT plan, giving you more stability and time to focus on your recovery. It also often acts as a first step in tapering off medication completely.
            </p>

            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              The Process of Transitioning From Suboxone to Sublocade
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Switching from Suboxone to Sublocade is relatively simple. Since both Sublocade and Suboxone contain buprenorphine, patients can usually make the switch relatively quickly and without side effects if the process is handled safely. However, there is still a process to follow to help your body adjust and eliminate any discomfort during the transition.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-6">
              Here&rsquo;s what you can typically expect during the process of switching from Suboxone to Sublocade:
            </p>

            <ProcessSteps
              steps={[
                {
                  title: 'Stabilization on Suboxone',
                  body: 'Before you can transition to Sublocade, you need to be stabilized on a daily dose of Suboxone between 8 mg and 24 mg for at least 7 days. Stabilization is important because it allows your body to become accustomed to buprenorphine before the transition.',
                },
                {
                  title: 'Start of Sublocade',
                  body: 'After stabilization, you will be administered Sublocade as a monthly injection by a medical professional. The first two monthly injections will be 300 mg to help establish a stable buprenorphine level in the body. Thereafter, the injection may be tapered down to 100 mg each month.',
                },
                {
                  title: 'Maintenance of Stability',
                  body: 'Sublocade’s extended-release formula gradually releases buprenorphine over a month’s time, allowing you to maintain stability without the need to make any further medication changes on a daily basis. This can help you experience fewer cravings and withdrawal symptoms, so you can remain on track in your recovery.',
                },
                {
                  title: 'Transition Off Medication',
                  body: 'Once you are being treated with Sublocade, you may also find it easier to transition off of medication entirely. Since the medication is released consistently into the bloodstream, you can taper more gradually and develop a plan that works for your situation and long-term goals.',
                },
              ]}
            />

            <p className="text-foreground/80 leading-relaxed mb-10">
              Your entire transition process will be monitored and supported by a medical professional to ensure your comfort and safety.
            </p>

            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Insurance Coverage for the Transition from Suboxone to Sublocade
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              One of the most frequently asked questions about Sublocade is whether insurance covers the treatment. While it can be a concern, it&rsquo;s essential to note that most insurance plans, including private PPO (Preferred Provider Organization) or POS (Point of Service) plans, typically cover treatment in various situations.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              At Seven Arrows Recovery, we know that insurance and treatment options can be difficult for many of our clients. That&rsquo;s why our admissions team is specially trained to help each client understand their insurance plan and work to verify benefits. We&rsquo;ll help you understand your coverage and ensure that Sublocade is covered by your plan so that your treatment is as affordable and accessible as possible.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              If you have questions about insurance or other financial options for Sublocade, please don&rsquo;t hesitate to reach out to us. We&rsquo;re here to help you better understand the process so that you can focus on your recovery.
            </p>

            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Seven Arrows Recovery Can Help You Transition from Suboxone to Sublocade
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Seven Arrows Recovery offers a full continuum of care to clients in all stages of recovery. Transitioning from Suboxone to Sublocade is one of many care changes we can help with. Our treatment services are specialized for veterans, first responders, and those seeking a more personalized approach to addiction treatment. Our treatment plans are always individualized to your goals and unique challenges to keep you as comfortable and safe as possible during recovery.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-6">
              Here&rsquo;s how Seven Arrows Recovery can help with transitioning from Suboxone to Sublocade:
            </p>

            <ProcessSteps
              steps={[
                {
                  title: 'Assessment',
                  body: 'Our team will first assess your current treatment stage and goals to determine the best path forward.',
                },
                {
                  title: 'Transition to Sublocade',
                  body: 'The transition to Sublocade is carefully monitored by our team of medical professionals to ensure a smooth, comfortable process.',
                },
                {
                  title: 'Medication Management',
                  body: 'Sublocade is administered monthly by our staff to support your medication management.',
                },
                {
                  title: 'Holistic Care',
                  body: 'We focus on the whole person in treatment, providing MAT alongside therapy, mindfulness training, and other holistic strategies for healing the mind, body, and spirit.',
                },
                {
                  title: 'Aftercare Planning',
                  body: 'Our care does not end after detox. Seven Arrows Recovery also offers aftercare planning to help you stay sober after transitioning into long-term recovery.',
                },
              ]}
            />

            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Transition From Suboxone to Sublocade in Arizona
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              In addition to the high-quality medical care that you&rsquo;ll receive from Seven Arrows Recovery, you can also benefit from healing in the Arizona climate. With endless open space and warm weather, Arizona offers some of the best views in the country. The beautiful desert views in Arizona can help you feel at ease, reduce stress, and clear your mind, allowing you time to focus on yourself and your recovery.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-10">
              Healing in Arizona will give your recovery journey a whole new meaning. At Seven Arrows Recovery, we incorporate the beauty of the Arizona climate into our therapeutic approach whenever possible, offering a holistic, truly healing experience.
            </p>

            <div className="bg-warm-bg rounded-2xl p-8 lg:p-10 text-center">
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Start the Recovery Journey at Seven Arrows Recovery
              </h3>
              <p className="text-foreground/70 leading-relaxed mb-4 max-w-xl mx-auto">
                Transitioning from Suboxone to Sublocade is a process, but you don&rsquo;t have to do it alone. If you or a loved one needs help with Suboxone addiction or wants to learn more about the Suboxone detox program at Seven Arrows Recovery, we&rsquo;re here to help. We offer a client-first approach that focuses on your health and well-being. Our specialized care provides the foundation you need to heal and move forward.
              </p>
              <p className="text-foreground/70 leading-relaxed mb-8 max-w-xl mx-auto">
                Contact our admissions team today to learn more about our Suboxone addiction treatment programs and find out if Sublocade is right for you. Your new and better tomorrow starts today with Seven Arrows Recovery &mdash; let&rsquo;s start this journey together.
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
                <strong className="text-foreground/70">This is Episode 7 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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

function ProcessSteps({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="space-y-3 mb-8">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="flex items-start gap-4 bg-white rounded-xl p-5 border border-gray-100 shadow-sm"
        >
          <div
            className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>
              {step.title}
            </h3>
            <p className="text-sm text-foreground/75 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
