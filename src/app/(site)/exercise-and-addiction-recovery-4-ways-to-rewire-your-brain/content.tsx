import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 13"
        title="Exercise and Addiction Recovery 4 Ways to Rewire Your Brain"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "Exercise and Addiction Recovery 4 Ways to Rewire Your Brain" },
        ]}
        description="Substance abuse and addiction wire your brain to prioritize substances above everything else. Your lifestyle bends to accommodate them, and your enjoyment of things you used to love slowly wanes. One of the ways that these…"
        image="/images/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <p className="text-lg text-foreground/80 leading-relaxed mb-6">
              {"Substance abuse and addiction wire your brain to prioritize substances above everything else. Your lifestyle bends to accommodate them, and your enjoyment of things you used to love slowly wanes. One of the ways that these patterns and their underlying causes are addressed in residential treatment is through exercise—the rewiring of the brain and healing of the body."}
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              {"Because exercise releases chemicals that are beneficial for your body, incorporating rigorous physical activity into your routine can be life-changing. Keeping up a fitness regime is one of the best ways to support your ongoing recovery and to rebuild new pathways in the brain."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"What Do Exercise and Addiction Recovery Have to Do With the Brain?"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Many studies have proven the benefits of exercise for overall health and well-being. But what about those in addiction recovery for substance use and abuse disorders?"}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"One recent study sought to examine just that, as well as the specific ways that physical exercise affected individuals in recovery from nicotine, alcohol, and illicit drug use. Their findings demonstrate—but aren’t limited to—the following benefits of exercise:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Increased abstinence from substance abuse"}</li>
              <li>{"Reduced withdrawal symptoms"}</li>
              <li>{"Reduced anxiety for those in detox and recovery"}</li>
              <li>{"Improvement in depression for illicit drug users"}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Moreover, their study reiterated the importance of exercise for general brain cognition, object recognition memory, and the reduction of perceived stress. The four tips to rewire your brain listed below take the latest research and suggest that healing is achievable—and your brain agrees!"}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"4 Tips to Help Rewire Your Brain"}
            </h2>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"#1: Find a Routine and Improve Sleep"}
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Routine: When you set aside a certain time to exercise each day and stick to it, your body will thank you. By exercising a set time, you might be surprised at how much easier it is to have energy when you need it and rest when you need it. This makes all the difference in the recovery process."}</li>
              <li>{"Sleep and Brain Health: Many people who struggle with addiction end up staying awake late at night and then getting up late in the day. When you don’t sleep at the times your body and with the natural progression of the day, your hormones and neurotransmitters can get out of balance very quickly. Regular sleep helps maintain these healthy patterns and promotes proper balance."}</li>
            </ul>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"#2: Heal the Body and Mind"}
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Body Wholeness: When you exercise, your heart pumps blood around your body faster to provide oxygen to your hardworking muscles. The heart is a muscular organ, which means it’s made out of muscle tissue. Just like your bicep muscles or abs, if you don’t get it working, the muscle gets weak. Exercise strengthens your heart, which ultimately strengthens your brain and chemical balances. Since drugs and alcohol are damaging for cardiovascular health, fitness is a great way to repair this damage and regain agency of your body."}</li>
              <li>{"Mind Wholeness: In addition to the chemical balance and health neurons that come with physical exercise, regular fitness can help you be present in your body. This sense of presence and being aware of the present moment can be developed into mindfulness practices. When you practice mindfulness, you start to recognize when unhealthy idleness starts to creep in. During these times, exerting energy with a dance workout or going on a long walk are some of the best ways to overcome boredom without resorting to substance use."}</li>
            </ul>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"#3: Expand Your Social Circle"}
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Meet a New Friendship Group: When you find the type of fitness that works for you, look for local classes. Fitness sessions are usually affordable and lots of fun. There are beginner, intermediate, and expert levels, so you can find a group that matches your ability level. It’s a great way to make new friends who have a shared interest that’s healthy and conducive to recovery. The more positive people you surround yourself with, the better your chances are of maintaining sobriety in the long run."}</li>
              <li>{"Build Confidence: Exercise can also build confidence in one’s sense of self, body, and overall personhood. The endorphins released in exercise are known as one of the “feel good” chemicals, which can contribute to our overall sense of contentment and confidence. And since exercise isn’t always about competition or being the best, it’s a great place to practice setting realistic goals for yourself and feeling great when you meet them. The by-product of exercising regularly is feeling connected to your body and liking the skin you’re in."}</li>
            </ul>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"#4: Promote Long-Term and Sustained Recovery"}
            </h2>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Brain Recovery: In the midst of substance abuse and addiction, the person’s brain undergoes neuronal damage. Neurons are the synapses that bring information from one part of the brain to another—they are our chemical and electrical messengers. Once you enter the process of recovery, engaging in regular physical fitness will yield a higher success rate in your recovery because exercise rebuilds these neuron-pathways. In the long-term, you reduce the risk of relapse and promote the longevity of your healing and well-being. That alone should be enough motivation to seek out a boxing class or roll out your yoga mat."}</li>
              <li>{"Keep Things Interesting: Although routine and regularity are important for the recovery process, it’s also key to keep things interesting. Explore what you like and what works for you. What type of fitness gets you excited? Everyone can find a way of moving their body and getting their heart beating in a way that feels good to them. Exercise that you enjoy allows you to push through a barrier of resistance so you can achieve workout goals. Whether it’s half an hour of yoga or swimming in the local pool, you’ve got to find what works for you. The most important thing is that you get into an exercise routine and stick with it. Each day, as you see yourself gradually improve, your confidence and health will follow. This is what recovery is all about."}</li>
            </ul>

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
                <strong className="text-foreground/70">This is Episode 13 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
