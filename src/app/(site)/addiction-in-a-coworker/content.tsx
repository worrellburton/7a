import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 19"
        title="Addiction in a Coworker"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "Addiction in a Coworker" },
        ]}
        description="Navigating workplace relationships can be challenging under any circumstances, but when you suspect that a coworker might be struggling with drug addiction, it can feel overwhelming and deeply worrisome. Addiction in a coworker…"
        image="/hero/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              {"Navigating workplace relationships can be challenging under any circumstances, but when you suspect that a coworker might be struggling with drug addiction, it can feel overwhelming and deeply worrisome. Addiction in a coworker can complicate dynamics, and you may be wondering how best to handle these suspicions. Addiction doesn’t just affect the individual struggling with it; it often ripples throughout their lives, including their work environment. You may feel conflicted about whether to intervene, unsure of how to support them, or uncertain about how their struggles might affect the workplace."}
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              {"At Seven Arrows Recovery, we understand that addiction can create complicated dynamics, not only for the person experiencing it but for those who care about them as well. If you suspect addiction in a coworker, your concern is valid, and more importantly, your involvement could make a profound difference in their journey toward healing."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"In this article, we’ll explore actionable steps you can take to approach this delicate situation with compassion, clarity, and care. While it’s natural to feel hesitant, remember that addiction is often accompanied by shame and isolation. Your willingness to help could be the first step toward their recovery."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Recognizing the Signs of Addiction in a Coworker"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Before taking action, it’s essential to ensure your concerns are grounded in observable behavior rather than assumptions. Addiction can manifest differently in every individual, but there are common signs that might signal a substance abuse issue. These include:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Changes in Work Performance: If your coworker has been missing deadlines, showing up late, or struggling to complete even simple tasks, these could be signs of addiction impacting their professional life."}</li>
              <li>{"Unpredictable Behavior: Mood swings, irritability, or unusually erratic actions may indicate underlying struggles with substances."}</li>
              <li>{"Physical Symptoms: Noticeable changes in appearance, such as weight loss, bloodshot eyes, or tremors, could point to addiction-related health concerns."}</li>
              <li>{"Frequent Absences: If your coworker is frequently absent or takes extended breaks, it might be worth exploring whether these behaviors are connected to substance misuse."}</li>
              <li>{"Social Withdrawal: A person facing addiction may begin to isolate themselves, avoiding workplace gatherings or conversations they previously enjoyed."}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"While these signs can indicate drug or alcohol addiction, keep in mind they aren’t definitive proof. Additionally, you may struggle with determining the best course of action based on your observations. That’s why the following steps focus on approaching the situation and offering support in ways that prioritize human dignity and practical solutions."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Approach With Compassion"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If you’re considering addressing the issue directly, how you approach your coworker is as important as what you say. Addiction is often accompanied by feelings of shame, guilt, and fear, so sensitivity is vital. When speaking with your coworker:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Choose the Right Time and Setting: Find a private and calm environment free from distractions or time constraints. Avoid addressing sensitive topics in public spaces or during high-stress moments."}</li>
              <li>{"Use “I” Statements: Express your observations without sounding accusatory. For example, “I’ve noticed that you seem overwhelmed lately, and I’m worried about you,” is more supportive than “You’re acting strange—what’s going on with you?”"}</li>
              <li>{"Avoid Judgment: Remember, addiction is a chronic condition, not a moral failing. They may be defensive out of fear or shame, but how you communicate with them can help ease their guard. Let them know you’re coming from a place of genuine concern."}</li>
              <li>{"Listen More Than You Speak: If your coworker opens up, allow them to share their thoughts without interruptions or unsolicited advice. This can foster trust and show them you’re not trying to control the situation but are there to support them."}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"It’s worth noting that while this conversation can plant seeds of change, it doesn’t always produce immediate results. Addiction recovery is a journey, and your coworker may not be ready to take the first step right away. Stay patient and remind yourself that showing care and compassion is meaningful, even if change isn’t immediate."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Share Resources Without Pushiness"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Once you’ve connected with your coworker, you may feel compelled to encourage them to seek help. While this impulse comes from a loving place, it’s essential not to push too hard or overwhelm them with too many suggestions. Instead, approach the idea of professional help as a conversation rather than a demand."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"You might say, “I know this might be hard to talk about, but support is out there, for whatever you might be going through. Places like Seven Arrows Recovery help people take back control of their lives when things feel overwhelming.” By planting the idea gently, you allow them to consider seeking help without feeling forced or cornered."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Additionally, it may be helpful to share broad information about addiction treatment rather than specific facilities. This way, they feel empowered to explore options in their own time."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Engage HR or Leadership When Appropriate"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If the behavior exhibited by your coworker compromises workplace safety or the well-being of others, it may be necessary to consult with management or your HR department. This step requires careful consideration—it’s essential to prioritize your coworker’s privacy and dignity while also protecting the collective safety of your workplace."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"When engaging leadership, focus on objective observations (“I’ve noticed X and it concerns me”) rather than speculations or interpretations. Most HR departments are trained in handling sensitive matters discreetly and professionally and can assist in connecting your coworker with helpful resources."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Focus on Patience and Persistence"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"When you extend kindness and concern to someone battling addiction, it’s natural to hope for quick, visible results. However, recovery is rarely linear. Your coworker may struggle to acknowledge their situation, or they may relapse after progress. What matters most is that you continue to show compassion, not only to them but also to yourself. You’re doing what you can, and that’s meaningful."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"If you Suspect Addiction in a Coworker, We’re Here to Help"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If someone you care about is battling addiction, you don’t have to handle this alone, and neither do they. At Seven Arrows Recovery, we understand the complexities of addiction and the courage it takes to confront it. Whether you’re seeking ways to support a coworker or someone close to you, remember that recovery is possible. Compassionate, individualized care can help bring hope back into their lives and yours."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If you’re ready to take the first step or want to learn more about how addiction treatment works, reach out to us at Seven Arrows Recovery. We’re here to provide the tools, therapy, and community your loved one needs to embrace lifelong healing. Contact us today for addiction treatment in Arizona—we’re here to support you on your journey to recovery."}
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
                <strong className="text-foreground/70">This is Episode 19 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
