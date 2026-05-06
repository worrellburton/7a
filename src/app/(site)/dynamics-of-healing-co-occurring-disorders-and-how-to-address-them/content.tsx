import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label={'The Recovery Roadmap — Episode 48'}
        title={'Dynamics of Healing Co Occurring Disorders and How to Address Them'}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: 'Dynamics of Healing Co Occurring Disorders and How to Address Them' },
        ]}
        description={'Did you know that the brain is one of the most complex parts of the human body? It regulates and cooperates with multiple systems, and keeps everything in balance with one another.'}
        image="/images/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              What Are Co-Occurring Disorders?
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Did you know that the brain is one of the most complex parts of the human body? It regulates and cooperates with multiple systems, and keeps everything in balance with one another.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Because of these complexities, it should not surprise you that substance abuse and addiction affect the brain in significant ways. Addiction can instigate, perpetuate, and sometimes mask symptoms of other mental and emotional disorders. And since substances like drugs and alcohol influence the brain and chemical balances, it can be tricky to identify how or why something started.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              This is where co-occurring disorders (CODs) come in. A co-occurring disorder accompanies or co-occurs with a diagnosis of substance abuse disorder or addiction. CODs are often psychological, mental, emotional, and even physical. They are also called &ldquo;dual disorders&rdquo; or &ldquo;dual diagnoses.&rdquo; The best professional treatments for addiction and substance abuse focus on each of a client&rsquo;s disorders individually, as well as how they affect each other.
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              How Common Are CODs?
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              A recent study found that 50-70% of clients in treatment for substance abuse disorder in the last ten years had histories of at least one psychological disorder. The reverse was true for those in treatment for psychological conditions. Between 20-50% of clients had current or past histories with addiction or substance abuse.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Many people don&rsquo;t know how common it is to have more than one psychological health disorder. As a result, the risk of addiction patterns forming increases drastically. Sometimes a mental illness precedes substance abuse. For others, mental or emotional disorders develop after or because of the abuse or addiction. In both situations, one disorder almost always amplifies the expressions of the other diagnoses.
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              What Types of CODs Are There?
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Many CODs can be quite severe, such as personality disorders, behavioral disorders and psychotic disorders. Other CODs are less obvious and may just look like underlying anxiety or depression.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Developmental disabilities that start at a young age can also turn into CODs. One such example is learning disabilities, which can affect social, linguistic, and even physical developments. But when it comes to substance abuse and addiction, CODs more commonly refer to psychological disorders rather than developmental disabilities.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The broad categories of CODs include but are not limited to the following:
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Mood Disorders (depression, bipolar)
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Anxiety Disorders (social, PTSD, OCD, panic anxieties)
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Psychotic Disorders (schizophrenia, schizoaffective)
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Eating Disorders (anorexia, bulimia)
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Personality Disorders (narcissistic, paranoia, histrionic)
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Behavioral Disorders (defiance, hyperactivity)
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              What Are the Symptoms of CODs?
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The signs and symptoms of CODs vary based on each individual. Everything from socioeconomic circumstances, the types of substances they are abusing, and the types of mental-emotional disorders can express CODs differently.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Some of the behavioral symptoms of CODs may include:
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Seclusion
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Thoughts or attempts of suicide
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              General aggressiveness
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Drastic and irrational mood changes
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Trouble with authority
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Employment instability
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Housing instability
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Financial instability
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Prostitution or sexual deviance
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Resistance to hygiene and cleanliness
            </h2>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Difficulty focusing
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              You may be thinking that many of the signs of CODs are similar to those of addiction and substance abuse. Because of this, it can be tough to identify the source of the symptom. In other words, is the mental disorder triggering the substance abuse or vice versa? Professional treatment centers are acquainted with navigating these complexities.
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              How Do CODs and Addiction Start?
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Environmental Factors:
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Stressful and traumatic situations (whether early in life or later) often trigger an underlying psychological health disorder that was previously dormant. In the midst of stress, substance use and abuse can become appealing as a stress outlet.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Similar Brain Responses:
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              The parts of the brain that regulate mood, stress, and reward systems are stimulated in a similar way by both substance abuse and mental-emotional disorders.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Early Exposure:
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              A person has a higher risk of substance abuse if they are exposed to drugs or alcohol at a young age. Hereditary or genetic predisposition can magnify this exposure even more. Early exposure holds the potential to affect the development of the brain and bodily response systems, as well as the development of psychological disorders.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Social Stigma:
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              One of the biggest hardships of those with mental disorders is the social stigma that comes with their diagnosis. They might be perceived as dangerous, intrinsically broken, or sometimes even contagious. These harmful misunderstandings are clearly incorrect. But they can cause fear and shame for those with CODs, which may lead to self-isolation and resistance to outside assistance.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Incarceration Injustices:
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Of the number of incarcerated individuals convicted of possession and use of illegal substances, those with CODs have a higher likelihood of being incarcerated again within a six-year period. Unfortunately, the criminal justice system fails to identify such cases. This results in an unending incarceration cycle and a lack of treatment for those that desperately need it.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Homelessness:
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              People experiencing homelessness often have multiple CODs. Moreover, they often have difficulty accessing healthcare because of distrust, financial limitation, and sometimes even the mental disorders themselves. These internal and external barriers form a feedback loop that is difficult to break without outside intervention.
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-10" style={{ fontFamily: 'var(--font-display)' }}>
              Can a Person Recover from Their CODs?
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Professional treatment centers are the best place to start if someone you know is struggling with one or multiple CODs. A treatment center will first provide a dual-diagnosis, which involves treating any underlying causes of addiction (such as mental and emotional disorders) alongside the person&rsquo;s substance abuse patterns.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              While detoxification is often emphasized as one of the main treatments at a recovery center, it is not adequate on its own to address addiction. The psychological background and traumatic events in a person&rsquo;s life that drove them to that point are just as important in the process of healing. In-patient and out-patient care, as well as making a clear aftercare program, are key parts of walking the path of recovery from addiction and CODs.
            </p>

            <div className="bg-warm-bg rounded-2xl p-8 lg:p-10 text-center mt-12">
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Start the Recovery Journey at Seven Arrows Recovery
              </h3>
              <p className="text-foreground/70 leading-relaxed mb-8 max-w-xl mx-auto">
                You don&rsquo;t have to walk this road alone. Our admissions team in Arizona is ready to listen, answer your questions, and help you find the next right step &mdash; whatever that looks like for you or your loved one.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="tel:8669964308" className="btn-primary">
                  Call (866) 996-4308
                </a>
                <Link href="/admissions" className="btn-outline">
                  Start Admissions
                </Link>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100">
              <p className="text-sm text-foreground/50 mb-4">
                <strong className="text-foreground/70">This is Episode 48 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
