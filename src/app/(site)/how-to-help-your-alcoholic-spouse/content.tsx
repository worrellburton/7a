import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 16"
        title="How to Help Your Alcoholic Spouse"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "How to Help Your Alcoholic Spouse" },
        ]}
        description="Alcohol abuse is a pervasive issue that affects millions of individuals and their families worldwide. When someone you love is struggling with alcohol use disorder (AUD), the impact reverberates throughout the household, causing…"
        image="/hero/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              {"Alcohol abuse is a pervasive issue that affects millions of individuals and their families worldwide. When someone you love is struggling with alcohol use disorder (AUD), the impact reverberates throughout the household, causing emotional, psychological, and sometimes even physical distress. If you’re wondering how to help your alcoholic spouse, you’ve already taken the first step. Recognizing the signs that your spouse may have a drinking problem is the first critical step toward helping them find the support and recovery they need."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Typical Signs of Alcohol Abuse"}
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Frequent Intoxication: Regularly appearing drunk or having alcohol on their breath."}</li>
              <li>{"Memory Blackouts: Experiencing frequent memory lapses or “blackouts” after drinking."}</li>
              <li>{"Neglecting Responsibilities: Failing to fulfill obligations at work, home, or school due to drinking."}</li>
              <li>{"Drastic Behavioral Changes: Showing aggression, irritability, or severe mood swings."}</li>
              <li>{"Increasing Alcohol Tolerance: Needing more alcohol to achieve the same effects."}</li>
              <li>{"Hiding Alcohol Use: Drinking in secret or hiding bottles around the house."}</li>
              <li>{"Health Problems: Developing health issues directly attributed to alcohol use, such as liver disease."}</li>
            </ul>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Actions to Take if You Suspect Your Spouse is Abusing Alcohol"}
            </h2>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              {"Suspecting that your spouse is struggling with alcohol abuse is a challenging realization. However, taking the right steps can make a significant difference in addressing the issue and paving the way for recovery."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"1. Approach with Compassion and Concern"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Approach your spouse with a sense of empathy and concern. Avoid accusations or confrontations that might provoke defensiveness. Instead, express your observations calmly and highlight your concerns about the impact of their drinking on their health and your family."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"2. Educate Yourself"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Understanding alcohol use disorder is crucial. Take the time to read about the condition, its effects, and the available treatment options. Being well-informed will empower you to support your spouse more effectively."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"3. Encourage Professional Help"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Encourage your spouse to seek professional help. Emphasize the importance of talking to a healthcare provider or a counselor who specializes in addiction."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"4. Seek Support for Yourself"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Joining support groups like Al-Anon can be immensely beneficial. These groups provide a space to share experiences and gain advice from others who are facing similar challenges."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"5. Establish Boundaries"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Set clear boundaries that protect yourself and any children involved. Communicate these boundaries to your spouse to ensure there is an understanding of what behavior is unacceptable."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"6. Avoid Enabling"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"While it’s natural to want to help, avoid enabling behaviors such as covering up for your spouse, providing alibis, or financially supporting their drinking habits."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Benefits of Treatment for Alcohol Use Disorder"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Addressing alcohol use disorder through professional treatment offers numerous benefits that significantly enhance the likelihood of long-term recovery."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Physical and Mental Health Improvement"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Alcohol detox and treatment programs can help restore your spouse’s physical health by addressing withdrawal symptoms and underlying medical conditions. Furthermore, therapeutic interventions can improve mental health by addressing co-occurring disorders such as depression and anxiety."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Structured and Supportive Environment"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Treatment programs provide a structured environment where individuals can focus solely on their recovery. This structure is essential in breaking the cycle of alcohol abuse and establishing new, healthy routines."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Access to Therapy and Counseling"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Comprehensive treatment includes individual and group therapy sessions that help individuals understand the root causes of their addiction and develop coping strategies. Family therapy can also be beneficial in repairing relationships and building a supportive home environment."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Prevention of Relapse"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Professional treatment equips individuals with the tools and strategies needed to prevent relapse. This includes understanding triggers, developing coping mechanisms, and establishing a support network post-treatment."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"The Role of Loved Ones in Treatment"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Loved ones play a pivotal role in the recovery process. Your support, encouragement, and involvement can make a significant difference in your spouse’s journey to sobriety."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Be Supportive and Encouraging"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Offer consistent support and encouragement throughout the treatment process. Celebrate small victories and be patient with the ups and downs of recovery."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Participate in Family Therapy"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Participate in family therapy sessions offered by treatment centers. These sessions can foster open communication, heal past wounds, and strengthen family bonds."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Educate Yourself on the Recovery Process"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Understanding the recovery process, including the challenges and milestones, will help you provide informed and empathetic support to your spouse."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Maintain a Substance-Free Home"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Create a substance-free environment at home to support your spouse’s recovery. Remove any alcohol from the house and avoid bringing it into the home."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Get Help For Your Alcoholic Spouse Today"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If your spouse is struggling with alcohol use disorder, it’s never too late to seek help. Professional treatment is the most effective path to recovery, and compassionate support from loved ones can make a significant difference."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"At Seven Arrows Recovery in Arizona, we offer comprehensive, compassionate care tailored to the unique needs of each individual. Our experienced team is dedicated to helping your spouse overcome alcohol abuse and embark on a lasting recovery journey."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Contact Seven Arrows Recovery today to discuss personalized treatment options and take the first step toward a healthier, happier future. Don’t wait—reach out now to find the support and guidance needed to help your loved one reclaim their life."}
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
                <strong className="text-foreground/70">This is Episode 16 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
