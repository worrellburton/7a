import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 22"
        title="Nature Versus Nurture: Explaining the Link Between Epigenetics and Addiction"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "Nature Versus Nurture: Explaining the Link Between Epigenetics and Addiction" },
        ]}
        description="Nature and nurture are often set as opposing forces. Does our innate nature or genes make us do what we do? Or are our actions determined by our environment and how we are nurtured?"
        image="/images/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"What Are Epigenetics?"}
            </h2>
            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              {"Nature and nurture are often set as opposing forces. Does our innate nature or genes make us do what we do? Or are our actions determined by our environment and how we are nurtured?"}
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              {"The research field of epigenetics examines these questions. Its findings show an important relationship between the two influences. In short, our environment influences the expression of our genes and our genes impact our predisposition toward environments."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"So, what does this have to do with addiction?"}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Addiction and Genetics"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Researchers have long pondered the question of how a person’s genes affect addiction. And while the jury is still out on the details of this question, there is concrete evidence that genes play a large role."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Certain genes have been linked with substance abuse and addiction. These genes, as researchers have shown, may cause someone to be more or less prone to substance dependency. Other genes, such as a genotype associated with tobacco addiction, have shown to have higher propensities for relapse after a period of abstinence."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Other examples include genotypes that determine how alcohol is metabolized. In other words, these genes influence how severe a person’s alcohol hangover is, and how they experience nausea, dizziness, or other alcohol-associated side effects. Depending on if someone has these genes, they might be more likely to suffer from alcohol abuse and addiction."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Genetic phenotypes, like those that regulate dopamine receptors in the brain, can also influence a person’s likelihood of addictive behavior. The risks of initial experimentation, the amount of addictive substances consumed, and the predisposition toward certain diseases can all be linked to a handful of “addiction genes.”"}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"But what about a person’s environment and interactions with others? How do these fit into the rest of the puzzle?"}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Understanding Nature and Nurture"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"According to child psychologist Dr. David Rettew, nature and nurture go hand in hand. In regards to treating genetic conditions, he explains that “not only are medications biological treatments but also things like psychotherapy, parenting guidance, mindfulness practices, exercise, and good eating habits.”"}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Therefore, a person’s health is influenced by both their genes and their environment."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"As an example, a child with hereditary links to substance abuse or addiction may be less likely to use drugs if their family life is stable and healthy. Even their social influences and how they were taught to handle peer pressure can affect their genetic expression."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"In any case, both healthy and unhealthy environments can either discourage or increase a person’s likelihood of addictive behaviors. Nature and nurture are interwoven and are constantly influencing each other."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Is Addiction a Disease?"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"According to a study in the Journal of Behavioral Psychology, “drug dependence is a chronic, relapsing disorder in which compulsive drug-seeking and drug-taking behaviours persist despite serious negative consequences.”"}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"But despite scientific and authoritative sources that classify addiction as a disorder, the debates continue as to whether or not addiction should be considered a disease. Many people still (erroneously) see addiction as a reflection of someone’s moral failings or weakness."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"But based on what genetics and behavioral sciences say, addiction is a complex—but very treatable—disorder. The American Society of Addiction Medicine (ASAM) defines addiction as “a treatable, chronic medical disease involving complex interactions among brain circuits, genetics, the environment, and an individual’s life experiences.”"}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"This knowledge is key to changing the cultural stigmas regarding addiction. It can also make addiction prevention and recovery resources more accessible to a wider population."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Addiction and the Brain"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Research has linked specific spots in the brain with addiction and substance abuse. For example, dopamine regulation regulates the pleasure receptors and reward centers. Normally, neuro-pathways can be formed by physical exercise, listening to music, and eating enjoyable food and can train the brain to associate these activities with “feeling good.”"}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"But if genetic predispositions toward addiction are present, these pathways can be easily overrun by harmful behaviors and substances. Many drugs have the potential to release much higher levels of dopamine in the brain than a “normal” activity would release. Thus, the reward becomes associated with substance abuse rather than a healthy activity."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"This is one of the reasons why it can be so difficult, if not impossible, for those who abuse drugs or alcohol to get sober on their own. The euphoria produced by the substances is very difficult to give up."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"How Epigenetics and Genetics Can Help"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Innovations in both genetics and epigenetic research show a promising future for addiction treatment. By researching how substance abuse changes the brain, medical professionals may be able to develop new types of treatments that target addictive disorders more directly."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Some researchers dream of finding the individual, isolated genes that might provide a so-called “on-off switch” in those suffering from addiction and may ultimately cure the disease of addiction. Other avenues of research that are perhaps more achievable include “neuroepigenetic editing, which is a promising method for determining the causal epigenetic molecular mechanisms that drive an addicted state.”"}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"In terms of treatment, innovative psychotherapies, cognitive behavioral therapy, and many others have proven promising for the lifelong process of recovery and well-being. And now that epigenetics has shown the impact a person’s environment has on their gene expression, we can be confident that every step makes a difference."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Can the Cycle be Broken?"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Despite the fact that the human DNA is almost 99.9% identical, that 0.1% difference is responsible for the diversities among humans. From hair and eye colors to greater likelihoods of certain diseases, therein also lies the genetic predispositions to addiction and substance abuse. But genes don’t determine everything."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"By seeing addiction as a disease and by treating it with long-term recovery goals, communities can expect better and more sustainable outcomes. The cycles of addiction and substance abuse can be broken by working with both genetic and biological therapies, as well as behavioral therapies. Nature and nurture don’t have to be at odds with one another anymore, especially when it comes to healing through the recovery process."}
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
                <strong className="text-foreground/70">This is Episode 22 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
