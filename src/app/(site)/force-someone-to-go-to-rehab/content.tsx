import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 15"
        title="Can I Force Someone to Go to Rehab?"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "Can I Force Someone to Go to Rehab?" },
        ]}
        description="Watching someone you love struggle with addiction is one of the most painful experiences you can go through. You see the damage it’s doing, to their health, their relationships, and their future, and you just want to help. But…"
        image="/images/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              {"Watching someone you love struggle with addiction is one of the most painful experiences you can go through. You see the damage it’s doing, to their health, their relationships, and their future, and you just want to help. But when they resist treatment, you may find yourself asking the hard question: Can I force someone to go to rehab?"}
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              {"It’s a question that comes from a place of desperation and deep concern, and while the answer depends on several factors, like where you live, their age, and the severity of their condition, it’s not always as straightforward as you’d hope."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Understanding the Limits of Control"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"When someone is over the age of 18, they are legally considered an adult. This means that, in most cases, you cannot force someone to go to rehab unless certain legal conditions are met. Even when you can clearly see that they need help, adults have the legal right to make their own healthcare decisions—even if those decisions are destructive."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"There are exceptions, of course. If a person poses an immediate threat to themselves or others, or if their addiction has led to severe psychiatric issues, you may be able to petition the court for involuntary treatment. Some states have laws—often called civil commitment laws—that allow family members or medical professionals to request court-ordered rehab. However, these laws vary by state and are typically used only in extreme cases."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Why Choosing to Force Someone to Go to Rehab May Not Be Effective"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Even if it’s legally possible in your area to force someone to go to rehab, the bigger question is, will it work? Research and clinical experience suggest that people are more likely to achieve lasting recovery when they’re personally motivated to change."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Forcing someone into treatment might lead to short-term detox or a brief stay at a facility, but unless they’re emotionally ready to confront their addiction, the results are often temporary. True recovery requires willingness, honesty, and ongoing commitment. That said, involuntary rehab has helped some people reach a turning point, especially when it’s part of a broader intervention supported by family, therapists, and addiction professionals."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Exploring Alternatives Before Forcing Someone to go to Rehab"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Before attempting to force a loved one to go to rehab, it’s often better to try other ways to encourage your loved one to accept help voluntarily. One powerful approach is holding a structured intervention. This involves gathering close friends or family members to express concern in a nonjudgmental way and to clearly present the consequences of not seeking treatment."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"During an intervention, you can offer your loved one options for rehab, make clear boundaries, and show that you’re ready to support them if they choose help. Sometimes, knowing that rehab is available, and that loved ones will walk beside them, can be the nudge they need."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"At Seven Arrows Recovery, we often work with families before treatment even begins, offering intervention guidance and support in opening the door to help."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"What to Do if They Still Refuse Help"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Even after expressing your concerns and setting boundaries, some people still refuse treatment. That’s one of the most heartbreaking realities of addiction. But you are not powerless. You can:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Establish and maintain healthy boundaries to protect your own emotional and physical well-being."}</li>
              <li>{"Seek support for yourself, such as therapy or support groups like Al-Anon."}</li>
              <li>{"Stay consistent with your message: “I care about you, and I believe you need help.”"}</li>
              <li>{"Educate yourself on addiction and treatment options so you’re ready when they are."}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"It’s incredibly difficult, but sometimes, the most effective way to help someone is by stepping back until they’re ready to step forward."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"When It Becomes a Crisis"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"In some cases, addiction progresses to a life-threatening level. Your loved one may overdose, experience serious mental health deterioration, or be involved in legal trouble. If you truly believe they are a danger to themselves or others, you may be able to take emergency action by contacting your local authorities, hospital, or crisis response team. These situations are incredibly delicate, and they often call for professional guidance."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If you’re at this point, Seven Arrows Recovery can help you understand what your options are and connect you with resources in your state that address involuntary treatment processes."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Choosing the Right Time and Place to Force Someone to Go to Rehab"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"The truth is, no one wants to force someone to go to rehab, what you really want is for them to want recovery for themselves. And while you may not be able to make that choice for them, you can create the conditions where choosing rehab feels possible, even hopeful."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"At Seven Arrows Recovery in Arizona, we offer a compassionate, trauma-informed approach that helps clients feel safe, respected, and empowered. Our team understands the complex emotional layers of addiction, and we work closely with families to support not just the individual struggling with substance use—but everyone affected by it."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Whether your loved one is ready now, or you’re still trying to reach them, we’re here to help you navigate the next step."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Contact Seven Arrows Recovery Today"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If you’re wondering whether you can force someone to go to rehab, know this: you don’t have to figure it out alone. Our team at Seven Arrows Recovery is here to help you understand your options, support your family dynamic, and guide your loved one toward meaningful, lasting treatment."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"We offer medically supervised detox, residential treatment, holistic therapies, and individualized care plans—all in a peaceful Arizona setting designed for real healing."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Call us today or fill out our secure contact form to speak with our team. Whether you’re looking for advice, resources, or immediate help, we’re here to walk this path with you."}
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
                <strong className="text-foreground/70">This is Episode 15 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
