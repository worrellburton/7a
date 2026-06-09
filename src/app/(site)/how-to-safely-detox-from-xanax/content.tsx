import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 27"
        title="How to Safely Detox from Xanax"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "How to Safely Detox from Xanax" },
        ]}
        description="Detoxing from Xanax can feel scary, but necessary at the same time. It’s an important step toward recovery, but many people worry about what will happen when they stop. Xanax, or alprazolam, is a benzodiazepine that’s often…"
        image="/hero/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              {"Detoxing from Xanax can feel scary, but necessary at the same time. It’s an important step toward recovery, but many people worry about what will happen when they stop. Xanax, or alprazolam, is a benzodiazepine that’s often prescribed for anxiety or panic disorders. At first, it brings relief and helps calm the mind. Over time, though, the body can become dependent on it. What once felt helpful can start to feel like something you can’t live without. In order to heal from addiction, you must first safely detox from Xanax."}
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              {"Stopping Xanax suddenly without medical help is not safe. Withdrawal can be severe and, in some cases, life-threatening. Symptoms may include shaking, confusion, or seizures. Because of these risks, medically supervised detox is essential. At Seven Arrows Recovery, our goal is to help people safely detox from Xanax with care and support throughout the process."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"It’s normal to have questions—about safety, how long detox takes, and how to pay for treatment. This guide explains why supervised Xanax detox in Arizona is so important, how professional care makes a difference, and how insurance can help make treatment affordable and accessible."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Why Detox From Xanax Requires Medical Supervision"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Quitting Xanax is not the same as stopping caffeine or nicotine. It’s not something you can push through with willpower or a few rough nights. Over time, your brain gets used to having the drug and changes how it works. When you stop suddenly, your nervous system reacts strongly. Withdrawal symptoms can appear quickly. Anxiety returns and can feel worse than before. Sleep becomes difficult. Muscles may twitch, and nausea is common. In some cases, people experience seizures that can be serious and unpredictable."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Here are the withdrawal symptoms most people face:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Intense anxiety and restlessness"}</li>
              <li>{"Nights without sleep"}</li>
              <li>{"Irritability or sudden mood swings"}</li>
              <li>{"Nausea and vomiting"}</li>
              <li>{"Tremors that won’t stop"}</li>
              <li>{"Panic attacks"}</li>
              <li>{"Seizures, in severe cases"}</li>
              <li>{"Hallucinations or altered reality"}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"That last part—the seizures, the hallucinations—that’s what makes unsupervised detox so dangerous. It isn’t just “unpleasant.” It can be life-threatening. And this is why attempting detox on your own, without medical oversight, can place you in serious danger."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"How Professional Treatment Can Help"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Detox does cleanse the body, but it’s a lot more than that. It’s about building a strong foundation for a recovery that can stand the test of time. Professional treatment not only removes the drug; it also creates stability, comfort, and a sense of hope in a place that once felt hopeless. Here’s how we help:"}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"1. Personalized Care Plans"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"No two stories of Xanax addiction are alike. Treatment programs need to be personalized and treat each client as their own individual person. Where someone might benefit from group therapy or DBT, another may see more progress with individual therapy and CBT. We personalize all of our plans, tailoring them along the way based on progress. Each client will experience their own unique combination of evidence-based treatments."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"2. Managing Withdrawal Symptoms"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Withdrawal comes with a whole host of side effects. Some of them are easy to handle, some aren’t. We don’t believe in suffering. Our treatments help reduce the impact of withdrawal symptoms so your initial stages of recovery are manageable. For more serious or life-threatening side effects, we have an excellent medical staff on site in case of medication needs or emergencies. You’re in good hands here."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"3. Holistic and Emotional Support"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Xanax detox isn’t only physical—it’s deeply emotional. Fear, sadness, and doubt often come up. That’s why we incorporate holistic therapies, such as mindfulness practices, yoga, nutritional care, and simple relaxation techniques. These aren’t extras; they’re lifelines that help calm the mind while the body adjusts. And through it all, our staff offers steady encouragement, because sometimes the most healing words are: You’re stronger than you think."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"4. A Safe and Structured Environment"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"At home, relapse is one bad night away. In detox, structure surrounds you. There’s no hidden stash, no impulsive reach for another pill. Instead, you get safety, predictability, and the space to focus fully on healing."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Detox is only the beginning. What follows—the therapy, the coping skills, the rebuilding—is where lasting recovery takes root. But without a safe detox, that future never gets the chance to grow."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"What Xanax Detox Really Feels Like"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Detoxing from Xanax is difficult. It’s uncomfortable and can feel like it will never end. Anxiety often comes back stronger. Sleep becomes hard to get. Cravings can be intense. Many people feel sadness or anger during this time—sadness for what they’ve lost or frustration with how dependent they’ve become on the drug."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"The good news is that with proper care, detox is manageable. In a medical program, symptoms are monitored and treated to keep you safe. You’re supported by professionals who know what to expect and how to help. The process is structured and calm, not chaotic. You’re not alone through it."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Insurance Coverage for Xanax Detox"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Cost is one of the biggest concerns people have about getting treatment. Many worry they can’t afford care. The truth is that most insurance plans cover detox and substance use treatment. This often includes PPO (Preferred Provider Organization) and POS (Point of Service) plans. At Seven Arrows Recovery, our admissions team helps verify coverage and explain benefits so you know what’s included before starting treatment."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Our admissions team handles the process. We’ll verify your coverage, explain what’s included, and ensure you know exactly what your plan covers before you begin. Many plans consider medically supervised detox a necessary care, which means you may be covered for a significant portion or even all of the process."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Detox From Xanax Safely at Seven Arrows Recovery"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"We’re more than just a treatment program. We’re a group of people who care about you and your recovery. At Seven Arrows Recovery, detox means real support and medical safety."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"You’ll have medical supervision around the clock from professionals who are with you every step of the way. Your detox plan is tailored to meet your needs and experiences. We offer holistic options like yoga, mindfulness, and nutrition support to help both your body and mind heal together. Once detox is complete, we assist you in transitioning directly into ongoing treatment, keeping your recovery on track."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Take the First Step Toward Healing"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Detoxing from Xanax is overwhelming, yes. But it’s also the first step toward freedom. And you don’t have to take it alone. At Seven Arrows Recovery, we walk with you—through the fear, the discomfort, the uncertainty—toward a life that feels yours again."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If Xanax has taken control of your life, today is the day to begin taking it back. Call us today to talk to us about our Xanax detox program and continuing treatment programs."}
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
                <strong className="text-foreground/70">This is Episode 27 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
