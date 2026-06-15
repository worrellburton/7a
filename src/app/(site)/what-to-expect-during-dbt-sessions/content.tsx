import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 26"
        title="What to Expect During Dbt Sessions"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "What to Expect During Dbt Sessions" },
        ]}
        description="Finding the perfect therapy solution for your addiction recovery or mental health needs can seem daunting. At Seven Arrows Recovery, we pride ourselves on offering highly effective therapies grounded in scientific research. DBT,…"
        image="/hero/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <p className="text-sm text-foreground/80 leading-relaxed mb-6">
              {"Finding the perfect therapy solution for your addiction recovery or mental health needs can seem daunting. At Seven Arrows Recovery, we pride ourselves on offering highly effective therapies grounded in scientific research. DBT, or dialectical behavioral therapy, has enabled thousands of people to make powerful, life-changing progress in their recovery. If you or a loved one is considering DBT as part of your treatment plan, read below to learn what to expect during DBT sessions."}
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed mb-10">
              {"DBT is much more than talk therapy. It’s a concrete, supportive, and effective form of therapy that can allow you to work through powerful emotions, learn to foster healthier relationships, and take control of your addiction triggers. If you’re wondering how DBT can help you or your addicted loved one, it’s important to understand exactly how DBT works."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Below, we’ll cover DBT therapy sessions, what to expect during DBT sessions, and how this form of treatment can work."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"How Does DBT Work?"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"DBT was originally created to help those struggling with borderline personality disorder. Since then, it has been used to help people work through many other issues such as addiction, depression, anxiety, and PTSD. DBT focuses on both acceptance and change."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"At its core, DBT helps individuals embrace two key truths:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Acceptance of one’s emotions and circumstances as they are."}</li>
              <li>{"The possibility of positive change through learning new skills and perspectives."}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"DBT and addiction treatment are undeniably intertwined, as many individuals struggling with addiction experience overwhelming emotions that lead them to turn to substances for relief. DBT teaches practical tools to cope with these emotions in healthier, more sustainable ways. The therapy focuses on four main skill areas:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Mindfulness: Learning how to stay present in the moment without judgment."}</li>
              <li>{"Distress Tolerance: Building strategies to cope with crisis situations without resorting to harmful behaviors."}</li>
              <li>{"Emotion Regulation: Understanding and managing powerful emotions that can feel overwhelming."}</li>
              <li>{"Interpersonal Effectiveness: Enhancing communication and relationships, with an emphasis on establishing boundaries and advocating for oneself."}</li>
            </ul>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"What to Expect During DBT Therapy Sessions"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Going to therapy can be scary, especially if you aren’t sure what to expect. At Seven Arrows Recovery, we understand that anxiety is why we wanted to walk you through what you can expect when you come in for your first DBT therapy session:"}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"1. Personalized Goal-Setting"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Your therapist will first work with you to identify the issues you want to work on and what you hope to get out of therapy. Whether you need help managing intense emotions, recovering from addiction, or learning how to build better relationships, we will tailor your treatment specifically to you and your goals. We’ll also discuss how your DBT treatment will complement other forms of treatment, such as addiction programs, trauma-informed therapy, and holistic therapies."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"2. Clearly Laid-Out Sessions"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"DBT sessions follow a specific structure that may feel reassuring to know there is a plan in place to help you heal. Each session will typically involve discussing situations you encountered during the week, learning skills, and identifying strategies you can use when similar situations arise in the future."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"During individual DBT therapy, you’ll meet one-on-one with your therapist to discuss your emotions, identify thought patterns, and learn how to build your own coping skills."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Many people benefit from both individual DBT and DBT group therapy. Group therapy can allow you to learn skills in a supportive environment, learn from your peers, and gain knowledge from others who are going through similar experiences."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"3. Providing a Safe Space"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Your therapist will provide a safe space for you to process anything that is on your mind. They are there to help you through every step of your therapy journey. During your DBT sessions, you aren’t being told you need to change who you are. Your therapist will help you identify the skills you already have and give you the tools to navigate life."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"4. Skills-Based Focus"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"A significant portion of your DBT therapy sessions will be focused on gaining real-world skills to help you better manage your life. Each session will focus on one of the four different DBT skill sets (mindfulness, distress tolerance, emotional regulation, and interpersonal effectiveness). Whether you need to learn how to better cope with triggers that affect your recovery or talk to your loved ones about your disorder, DBT will provide you with the skills to handle real-life situations."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"5. Relapse Prevention"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If you are using DBT to treat addiction, you will also learn about relapse prevention. Relapse prevention includes identifying why you have cravings, creating your toolkit to overcome your cravings, and empowering your ability to choose recovery."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"6. Support Between Sessions"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Between your DBT therapy sessions, you will likely have “homework” to complete. This can include exercises to help you work through certain issues when you are not in therapy. You will also have access to our compassionate staff if you need someone to help guide you in using your new skills in real time."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"The Road to Healing: DBT and Sobriety"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"There is no “quick fix” for addiction or mental health challenges, but DBT offers a path that is both empowering and transformative. Through this structured yet compassionate approach, many individuals learn how to reclaim their lives, build better relationships, and approach recovery armed with tools that foster resilience."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Research supports the effectiveness of DBT in addiction treatment. Studies show that DBT greatly reduces the likelihood of relapse by improving emotion regulation skills and increasing the ability to resist triggers. For example, a review published in the Journal of Substance Abuse Treatment found that individuals who completed DBT programs had significantly improved overall coping abilities, supporting long-term sobriety success (source)."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Why Seven Arrows Recovery for DBT Therapy?"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"At Seven Arrows Recovery, we approach DBT with one goal in mind: supporting your full recovery, mind, body, and spirit. Our DBT therapy sessions are integrated into a holistic program designed to meet your individual needs."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Here’s why Seven Arrows is the right place for healing:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Personalized Care: No two journeys are the same, and at Seven Arrows, every client’s treatment plan is uniquely designed based on their goals, triggers, and circumstances."}</li>
              <li>{"Experienced Clinicians: Our team is trained in delivering DBT with compassion and evidence-based precision."}</li>
              <li>{"Holistic Focus: Beyond DBT, we provide complementary therapies that nurture your emotional, mental, and physical health."}</li>
              <li>{"Supportive Community: We are more than just a treatment center—we’re a community that empowers individuals to heal and thrive in recovery."}</li>
            </ul>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Start Your Journey Toward Balanced Living Today"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Recovery is more than healing from addiction. It’s about creating a life that allows you to prosper in every way—and DBT can help you build that foundation for a life of balance. At Seven Arrows Recovery, we want to be with you every step of the way."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Perhaps you’ve been browsing “DBT therapy sessions” and are ready to learn more about DBT. If so, don’t wait another moment to start your journey toward emotional balance, strengthened recovery, and newfound hope. Let Seven Arrows Recovery guide you, and give you the tools you need to live a life of balance. Call or contact us today."}
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
                <strong className="text-foreground/70">This is Episode 26 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
