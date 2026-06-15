import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 41"
        title="What Makes a Rehab Holistic"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "What Makes a Rehab Holistic" },
        ]}
        description="Holistic rehab centers take a comprehensive approach to addiction treatment, addressing not only the physical aspects of addiction but also the emotional, mental, and spiritual components. These centers recognize that addiction…"
        image="/hero/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <p className="text-sm text-foreground/80 leading-relaxed mb-6">
              {"Holistic rehab centers take a comprehensive approach to addiction treatment, addressing not only the physical aspects of addiction but also the emotional, mental, and spiritual components. These centers recognize that addiction is a multifaceted issue, one that affects every part of an individual’s life. Therefore, they integrate a wide range of therapies, from traditional methods like counseling and medication to alternative practices such as yoga, meditation, and acupuncture."}
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed mb-10">
              {"This approach ensures that treatment is not just about managing symptoms but about fostering overall well-being, helping individuals reconnect with themselves on a deeper level. Holistic rehab also emphasizes the importance of lifestyle changes, community support, and the development of healthy coping mechanisms, ensuring that individuals are equipped to maintain sobriety long after they leave the facility. By focusing on healing the mind, body, and spirit, these centers offer a path to recovery that is as much about personal transformation as it is about overcoming addiction."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Seven Arrows Recovery is a holistic rehab that focuses on the person as a whole. It offers a sanctuary where individuals can heal in a supportive, nurturing environment that honors their unique journey to wellness."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Critical Components of a Holistic Rehab"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"A traditional rehab typically focuses on the clinical aspect of recovery, aiming to reduce symptoms and help individuals stop using. Holistic rehabs, on the other hand, take a more profound process by addressing all aspects of a person. These rehabs understand that addiction and mental health conditions often stem from emotional stress, past life experiences, and trauma. They also understand that addiction can impact individuals’ relationships, lifestyle, health, and overall well-being. In understanding this, holistic rehabs aim to provide a more well-rounded approach to recovery that will lead to long-term, sustainable recovery. Some of the key components of a holistic rehab include:"}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"1. Whole-Person Approach"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Holistic rehab centers focus on treating the whole person rather than just the addiction. This approach considers the patient’s physical, mental, emotional, and spiritual aspects, ensuring that all dimensions of a person’s well-being are addressed in the recovery process."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"2. Complementary Therapies"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"These centers often offer a variety of complementary therapies alongside traditional medical treatments."}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Acupuncture"}</li>
              <li>{"Yoga"}</li>
              <li>{"Meditation and Mindfulness"}</li>
              <li>{"Massage Therapy"}</li>
              <li>{"Nutritional Counseling"}</li>
              <li>{"Art and Music Therapy"}</li>
            </ul>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"3. Personalized Treatment Plans"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Each individual’s treatment plan is tailored to their specific needs, often including a combination of traditional and alternative therapies."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"4. Focus on Mental Health"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Holistic rehabs often place a strong emphasis on mental health, incorporating therapies like:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Cognitive Behavioral Therapy (CBT)"}</li>
              <li>{"Dialectical Behavior Therapy (DBT)"}</li>
              <li>{"Psychotherapy"}</li>
              <li>{"Group and Individual Counseling"}</li>
            </ul>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"5. Integrative Medicine"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Integrative medicine combines conventional Western medicine with complementary and alternative therapies, optimizing the body’s natural healing abilities while addressing the whole person."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"6. Spiritual Wellness"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"These centers often incorporate spiritual practices, which might include:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Meditation"}</li>
              <li>{"Mindfulness practices"}</li>
              <li>{"12-Step or alternative spiritual programs"}</li>
            </ul>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"7. Life Skills Training"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Holistic rehab centers often provide life skills training to help individuals reintegrate into society post-treatment. This can include:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Career counseling"}</li>
              <li>{"Educational support"}</li>
              <li>{"Stress management techniques"}</li>
            </ul>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"8. Environmental Healing"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"The environment of holistic rehab centers is usually designed to promote healing and wellness, and they are often situated in serene, natural settings."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"9. Community and Support Networks"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Emphasis on building a supportive community within and outside rehab, including family therapy and support groups."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Holistic Healing with Seven Arrows Recovery"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"In summary, holistic rehab centers aim to provide a nurturing environment where all aspects of an individual’s well-being are addressed to promote lasting recovery. Integrating traditional and alternative therapies, focusing on mental and spiritual health, and emphasizing personal growth and community support, Seven Arrows Recovery is a holistic rehab that focuses on the person, offering a sanctuary where true healing can occur on every level."}
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
                <strong className="text-foreground/70">This is Episode 41 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
