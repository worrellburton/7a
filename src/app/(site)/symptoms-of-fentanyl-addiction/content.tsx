import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 46"
        title="Symptoms of Fentanyl Addiction"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "Symptoms of Fentanyl Addiction" },
        ]}
        description="In recent years, the opioid crisis in the United States has escalated at an alarming rate, with fentanyl at its core. Fentanyl, a synthetic opioid, is up to 100 times more potent than morphine and about 50 times stronger than…"
        image="/images/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              {"In recent years, the opioid crisis in the United States has escalated at an alarming rate, with fentanyl at its core. Fentanyl, a synthetic opioid, is up to 100 times more potent than morphine and about 50 times stronger than heroin. Originally intended for pain management in patients with severe medical conditions, its potency makes it highly addictive and incredibly dangerous when misused. Understanding the signs and symptoms of fentanyl addiction is critical not only for those who may be struggling with it but also for their loved ones, who can play an essential role in the recovery journey."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"What is Fentanyl, and Why is it So Dangerous?"}
            </h2>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              {"Legally, Fentanyl can be prescribed by doctors to manage severe pain. Many patients who receive Fentanyl prescriptions are either battling cancer or recovering from major surgeries. Illicit use of Fentanyl is far more dangerous, as it is highly addictive and potent. The National Institute on Drug Abuse (NIDA) reports that synthetic opioids caused more than 70,000 deaths from overdoses in 2021."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Unlike other drugs, Fentanyl is lethal in very small doses, leaving almost zero room for error. As Fentanyl doses are so small, even the smallest miscalculation can cause a user to overdose. On the streets, Fentanyl is commonly mixed with heroin, cocaine, and pressed into fake pills. It’s nearly impossible for drug users to know how strong their drugs are when laced with fentanyl, which is why many overdose deaths occur."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"The Symptoms of Fentanyl Addiction"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Recognizing the symptoms of fentanyl addiction can help catch the problem early, potentially saving lives. Addiction to fentanyl can be both physical and psychological, impacting every aspect of a person’s life. Here are some of the key symptoms:"}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"1. Physical Symptoms of Fentanyl Addiction"}
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Respiratory Issues: Fentanyl slows down the respiratory system, creating shallow or labored breathing. Chronic misuse can lead to ongoing respiratory complications or failure."}</li>
              <li>{"Extreme Drowsiness: People suffering from fentanyl addiction often appear overly fatigued or may nod off at inappropriate times."}</li>
              <li>{"Constricted Pupils: A common sign of opioid use, including fentanyl, is pinpointed pupils."}</li>
              <li>{"Nausea and Vomiting: Continued use can disrupt normal bodily functions, leading to gastrointestinal issues."}</li>
              <li>{"Withdrawal Symptoms: When the drug is not in their system, addicts often experience withdrawal symptoms such as muscle aches, anxiety, diarrhea, and cold sweats."}</li>
            </ul>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"2. Behavioral Symptoms of Fentanyl Addiction"}
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Compulsive Drug-Seeking: A person addicted to fentanyl may go to great lengths—sometimes illegal—to obtain the drug."}</li>
              <li>{"Isolation: Addicts often withdraw from loved ones and social activities, preferring to use the drug alone."}</li>
              <li>{"Neglecting Responsibilities: Work, school, or family obligations may fall to the wayside as the addiction takes over."}</li>
              <li>{"Mood Changes: Fentanyl can cause drastic mood swings, including anxiety, irritability, or depression, especially when the user is unable to obtain the drug."}</li>
            </ul>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"3. Cognitive Symptoms"}
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Memory Loss or Confusion: Long-term fentanyl use can impair cognitive function, making it harder for the individual to concentrate or remember events."}</li>
              <li>{"Loss of Decision-Making Ability: The addiction often clouds judgment, leading to reckless behavior or poor life choices."}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Recognizing these symptoms early is crucial, as continued fentanyl use greatly increases the risk of overdose and death."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"The Prevalence of Fentanyl Addiction in the U.S."}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"The Centers for Disease Control and Prevention (CDC) reported that synthetic opioids, like fentanyl, were involved in almost 68% of opioid-involved overdose deaths in 2020. And in Arizona, opioid-related overdoses continue to skyrocket."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"What may alarm you most is the increase in fentanyl found in fake prescription pills. The Drug Enforcement Administration (DEA) recently released an analysis that found 6 out of 10 fake pills tested across the country contained a lethal dose of fentanyl. If you struggle with misuse of other substances, chances are you didn’t know you were taking fentanyl – and now it’s easier than ever to accidentally take it."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"How Fentanyl Addiction Impacts Loved Ones"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"While the primary focus often falls on the person addicted, it’s important to understand that fentanyl addiction takes a profound toll on loved ones as well. Family members may feel helpless, frustrated, or even resentful as they watch someone they care about struggle with this powerful substance. Educating yourself about fentanyl addiction can not only provide clarity but also empower you to intervene effectively."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Treatment Options for Fentanyl Addiction"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Fentanyl addiction is a serious and life-threatening condition, but recovery is possible. Professional help is crucial to overcome addiction, given the drug’s potency and the physical dependence it creates."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Some ways that doctors and therapists treat Fentanyl abuse and addiction include:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Medical Detox: Going through withdrawal from fentanyl can cause extreme discomfort. Medical detoxes from fentanyl allow patients to go through withdrawals safely under medical supervision."}</li>
              <li>{"Inpatient Treatment: Staying at a residential treatment facility allows the patient to receive round-the-clock care."}</li>
              <li>{"Behavioral Therapy: Counseling, such as cognitive behavioral therapy, can help patients understand their addiction."}</li>
              <li>{"Medication: Drug therapy can help with withdrawal."}</li>
              <li>{"Aftercare and Continuing Support: Recovery doesn’t end when you leave treatment. Support groups and ongoing counseling can help you stay sober."}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If you or someone you know is struggling with fentanyl addiction, it’s critical to seek support from an experienced treatment center. The dangers of continued use, including the high risk of overdose, make immediate intervention essential."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Why Choose Seven Arrows Recovery?"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Seven Arrows Recovery provides compassionate, comprehensive care for individuals battling drug and alcohol addiction in Arizona. With a team of experienced professionals and evidence-based therapies, we offer a supportive environment where you or your loved one can begin the journey to sobriety."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"At Seven Arrows Recovery, we offer personalized treatment plans tailored to each individual’s unique needs. From medical detox to therapy and ongoing support, our holistic approach equips you with the tools you need to build a healthier, drug-free future."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Take the First Step Toward Recovery"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Recognizing the symptoms of fentanyl addiction is the first step in helping yourself or a loved one break free from its grip. Fentanyl addiction is not a sign of weakness; it’s a disease that requires professional treatment and support. At Seven Arrows Recovery, we understand the challenges and complexities of addiction, and we are here to help you every step of the way."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Don’t wait until it’s too late. Contact Seven Arrows Recovery today to learn more about our services and take the first step toward a brighter future. Recovery is possible, and we’re here to help you achieve it."}
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
                <strong className="text-foreground/70">This is Episode 46 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
