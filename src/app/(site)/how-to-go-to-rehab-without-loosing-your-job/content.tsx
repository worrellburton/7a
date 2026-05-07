import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 11"
        title="How to Go to Rehab Without Loosing Your Job"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "How to Go to Rehab Without Loosing Your Job" },
        ]}
        description="Going to rehab can be a life-changing decision, but for many individuals, the fear of losing their job can prevent them from seeking the help they need. However, thanks to the Family and Medical Leave Act (FMLA), employees have…"
        image="/images/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              {"Going to rehab can be a life-changing decision, but for many individuals, the fear of losing their job can prevent them from seeking the help they need. However, thanks to the Family and Medical Leave Act (FMLA), employees have the right to take unpaid leave for medical reasons, including substance abuse treatment. In this article, we will explore how FMLA can enable you to attend rehab without jeopardizing your job security."}
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              {"FMLA provides job protection and allows eligible employees to take up to 12 weeks of unpaid leave for qualified medical reasons. While entering rehab may seem daunting, knowing your rights and understanding the process can give you the confidence to seek treatment without the fear of negative consequences at work."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Whether you are struggling with alcohol addiction, drug abuse, or any other substance dependency, FMLA can provide you with the opportunity to prioritize your health and recovery. By knowing how to navigate the FMLA paperwork, communicate with your employer, and maintain open lines of communication, you can ensure a smooth transition to rehab while safeguarding your job."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Don’t let the fear of job loss prevent you from seeking the help you need. Let’s explore how FMLA can make rehab a possibility while ensuring your employment remains secure."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"What is the Family and Medical Leave Act (FMLA)?"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"The Family and Medical Leave Act (FMLA) is a federal law that grants eligible employees the right to take unpaid leave for qualified medical reasons. Enacted in 1993, the FMLA aims to balance the needs of employees with the legitimate interests of employers. Under the FMLA, eligible employees are entitled to up to 12 weeks of unpaid leave within a 12-month period for various qualifying reasons, including the treatment of substance abuse."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"To be eligible for FMLA leave, an employee must work for a covered employer, have worked for the employer for at least 12 months, have worked at least 1,250 hours during the previous 12 months, and work at a location where the employer has at least 50 employees within a 75-mile radius. If you meet these criteria, you may be eligible to take unpaid leave for substance abuse treatment without the fear of losing your job."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"The FMLA also provides certain protections for employees, including maintaining group health insurance benefits during the leave period and the right to be reinstated to the same or an equivalent position upon return from leave. Understanding your rights under the FMLA is crucial when considering rehab as a viable option for your recovery journey."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Understanding the FMLA and Substance Abuse Treatment"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Substance abuse is a serious health issue that affects millions of individuals worldwide. Recognizing the impact addiction can have on an individual’s personal and professional life, the FMLA includes substance abuse treatment as a qualifying medical reason for leave. Whether you are struggling with alcohol addiction, drug abuse, or any other form of substance dependency, the FMLA can provide the opportunity to seek treatment without jeopardizing your job security."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Substance abuse treatment can take various forms, including inpatient rehabilitation programs, outpatient counseling, or intensive outpatient programs. The FMLA allows eligible employees to take leave for the time necessary to complete the treatment program recommended by a healthcare provider. This means that you can focus on your recovery without the added stress of potential job loss."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"It’s important to note that the FMLA does not require employers to pay employees during their leave; it only provides job protection and ensures continued access to health insurance benefits. However, some employers may offer paid leave options, so it’s worth exploring your company’s policies and any applicable state laws that may provide additional benefits."}
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
                <strong className="text-foreground/70">This is Episode 11 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
