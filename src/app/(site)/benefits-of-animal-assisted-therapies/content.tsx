import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 39"
        title="The Benefits of Animal-Assisted Therapies in Addiction Treatment"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "The Benefits of Animal-Assisted Therapies in Addiction Treatment" },
        ]}
        description="At Seven Arrows Recovery, we understand that the journey to recovery is deeply personal and challenging. Our mission is to support you every step of the way, offering a holistic blend of evidence-based and innovative therapies…"
        image="/images/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              {"At Seven Arrows Recovery, we understand that the journey to recovery is deeply personal and challenging. Our mission is to support you every step of the way, offering a holistic blend of evidence-based and innovative therapies tailored to your unique needs. One creative approach that has shown tremendous promise is Animal-Assisted Therapy (AAT), and understanding the benefits of animal-assisted therapies can help you integrate them into your treatment plan."}
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              {"Animals can naturally bring joy, comfort, and companionship into our lives. In the context of addiction treatment, they can play a transformative role, helping individuals reconnect with their emotions, build healthier relationships, and find new motivation on the path to recovery."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"The Role of Animals in the Therapeutic Journey"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"The benefits of animal-assisted therapies stretch beyond just spending time with animals; they involve structured and goal-oriented interactions designed to support mental and emotional healing. Research has shown that these interactions can:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Reduce stress and anxiety: Simply being around animals can lower cortisol levels, easing the stress and anxiety that often accompany addiction recovery."}</li>
              <li>{"Enhance mood: Caring for and bonding with an animal can release endorphins, which are natural mood lifters."}</li>
              <li>{"Improve social skills: Interactions with therapy animals can bolster social behaviors, such as empathy and trust, which are crucial for building healthy human relationships."}</li>
              <li>{"Support physical activity: Activities like walking a dog or participating in equine therapy encourage physical movement, which helps improve overall health."}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Let’s explore how different animals serve these therapeutic roles and contribute to the healing process in addiction treatment."}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Horses: Building Trust and Emotional Awareness"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Equine-assisted therapy (EAT) utilizes the intuitive nature of horses to foster personal growth and emotional healing. Horses are highly sensitive to human emotions and can mirror our feelings, helping us become more aware of our own inner states. Working with horses can teach key life skills such as:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Trust: Horses require a sense of trust and respect. As you build a relationship with a horse, you learn about boundaries and trust-building, which are essential for healthy human relationships."}</li>
              <li>{"Emotional Regulation: Because horses respond immediately to our nonverbal cues, they help us understand and manage our emotions more effectively."}</li>
              <li>{"Responsibility: Caring for a horse involves daily routines and responsibilities, which can instill a sense of purpose and discipline."}</li>
            </ul>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Dogs: Unconditional Love and Support"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Dogs are known for their loyalty and unconditional love, making them incredible companions in the recovery process. Therapy dogs provide:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Emotional Comfort: Their presence can be soothing, helping to alleviate feelings of loneliness and isolation."}</li>
              <li>{"Encouragement for Routine: The daily needs of a dog, such as feeding and walking, help establish a routine, which is crucial in recovery."}</li>
              <li>{"Opportunities for Social Interaction: Dogs naturally draw people together, promoting social interaction and reducing feelings of social anxiety and isolation."}</li>
            </ul>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Cats: Calm and Connection"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Cats, with their independent yet affectionate nature, play a unique role in therapy by offering:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Calm Presence: Their generally calm demeanor can help create a peaceful environment conducive to reflection and relaxation."}</li>
              <li>{"Encouragement of Touch: Petting a cat can be very soothing, helping to reduce stress and anxiety."}</li>
              <li>{"Emotional Bonding: Despite their independent nature, cats form strong bonds with their caregivers, teaching us about connection and care."}</li>
            </ul>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"Small Animals and Their Varied Benefits"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Smaller animals such as rabbits, guinea pigs, and birds also bring their own set of benefits to therapy:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Gentleness: Small animals can be less intimidating and easier to handle, making them great for those who are new to Animal-Assisted Therapy."}</li>
              <li>{"Boosting Mood: Their playful and curious nature can bring joy and laughter, which are vital for a positive recovery environment."}</li>
              <li>{"Teaching Responsibility: Caring for these smaller creatures encourages a sense of routine and accountability, aiding in the development of a structured lifestyle."}</li>
            </ul>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Experience the Benefits of Animal Assisted Therapies in Addiction Treatment"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"At Seven Arrows Recovery, we are dedicated to providing a comprehensive and compassionate approach to addiction treatment. Our commitment to integrating holistic therapies, like Animal-Assisted Therapy, reflects our belief in the power of diverse healing modalities to support your journey to sobriety."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Our equine-assisted experiences in Arizona offer a unique opportunity to connect with these magnificent animals and discover new pathways to healing and growth. These experiences are designed to help you build trust, emotional awareness, and a sense of responsibility, all within a supportive and nurturing environment."}
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
                <strong className="text-foreground/70">This is Episode 39 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
