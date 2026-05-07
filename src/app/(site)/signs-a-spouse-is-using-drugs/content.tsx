import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 8"
        title="Signs a Spouse is Using Drugs"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "Signs a Spouse is Using Drugs" },
        ]}
        description="Substance abuse doesn’t just affect individuals—it creates ripple effects that touch everyone close to them, especially spouses. If you’ve noticed your partner acting differently and you’re starting to worry about signs a spouse…"
        image="/images/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              {"Substance abuse doesn’t just affect individuals—it creates ripple effects that touch everyone close to them, especially spouses. If you’ve noticed your partner acting differently and you’re starting to worry about signs a spouse is using drugs, it’s essential to pay attention to these signs. Recognizing the signs a spouse is using drugs can help you take timely action and get the support your family needs."}
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              {"In many cases, the signs start small: changes in behavior, shifts in mood, or secretive habits that don’t add up. Over time, these issues can grow into serious concerns that affect emotional, financial, and physical well-being. Below, we explore the top five signs a spouse is using drugs, and what you can do to help them find a path to recovery."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"1. Sudden Behavioral and Emotional Changes"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"One of the first signs a spouse is using drugs is a noticeable change in their demeanor or behavior. You may see:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Extreme mood swings—happy one moment, angry or withdrawn the next"}</li>
              <li>{"Loss of interest in family time, hobbies, or responsibilities"}</li>
              <li>{"Becoming defensive or irritated when asked simple questions"}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If these behaviors emerge suddenly and persist, it may be more than just stress or fatigue. These emotional shifts are often early indicators that substance use is involved."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"2. Unexplained Financial Problems"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Drug use is expensive, and it often leads to hidden or increasing financial strain. You might notice:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Frequent ATM withdrawals or mysterious charges"}</li>
              <li>{"Bills are being missed, or household items are disappearing."}</li>
              <li>{"Sudden need to borrow money without clear reasons"}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If your spouse is typically responsible with money but you’re noticing financial chaos or secrecy, it’s worth considering whether substance use could be behind the change."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"3. Physical Health and Appearance Decline"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Another common sign a spouse is using drugs is a decline in personal hygiene or health. While not every change means drug use, consider whether your spouse is showing:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Sudden weight loss or gain"}</li>
              <li>{"Unusual marks, bruises, or constant sniffles"}</li>
              <li>{"Changes in sleep patterns—staying up for days or excessive sleeping"}</li>
              <li>{"Bloodshot eyes, frequent nosebleeds, or slurred speech"}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"When these physical symptoms accompany other red flags, they should not be ignored."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"4. Increased Secrecy and Isolation"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Addiction thrives in secrecy. If your spouse is suddenly guarding their phone, disappearing without explanation, or locking themselves in a room for long periods, they may be hiding drug use. You might also see:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Lies about where they’ve been or who they were with"}</li>
              <li>{"Keeping new “friends” a secret"}</li>
              <li>{"Increased irritability when asked about their plans or behavior"}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"This kind of secretive behavior is one of the most consistent signs a spouse is using drugs, and it can place a significant emotional strain on a relationship."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"5. Trouble at Work or Legal Issues"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"When drug use escalates, it often affects every area of life, including employment and legal standing. Warning signs can include:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Being written up at work, frequently calling out, or losing a job"}</li>
              <li>{"DUIs, arrests, or legal trouble that’s vaguely explained"}</li>
              <li>{"Continuing to use substances even after facing serious consequences"}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If your spouse’s professional life or legal standing is suddenly unstable, it’s time to consider whether addiction is a factor."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"What to Do if You Notice Signs a Spouse Is Using Drugs"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If you’re noticing these warning signs, you may be overwhelmed, heartbroken, or unsure of what to do next. It’s natural to feel confused, especially if your spouse denies the issue or blames other factors. But early intervention can make a big difference."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Start by documenting your concerns and any patterns you observe. Approach your spouse from a place of compassion, not confrontation, and express your desire to help them, not punish them. Avoid enabling behaviors, such as covering up for their actions or ignoring problems out of fear. And most importantly, don’t try to handle everything on your own. Addiction is a complex disease that requires professional help and family support."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Get Help from Seven Arrows Recovery"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If you’ve recognized any of these signs that a spouse is using drugs, know that you’re not alone, and help is available. At Seven Arrows Recovery in Arizona, we offer personalized addiction treatment in a supportive and healing environment. Our programs address both substance use and the family dynamics affected by addiction, offering a holistic path forward."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Contact Seven Arrows Recovery today to learn how we can help your spouse reclaim their life—and how you can begin healing, too."}
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
                <strong className="text-foreground/70">This is Episode 8 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
