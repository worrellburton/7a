import Link from 'next/link';
import PageHero from '@/components/PageHero';

export default function PageContent() {
  return (
    <>
      <PageHero
        label="The Recovery Roadmap — Episode 28"
        title="Farm to Table to Healing a Conversation About Food and the Recovery Process with Chef Sandra Bradley"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Recovery Roadmap', href: '/who-we-are/recovery-roadmap' },
          { label: "Farm to Table to Healing a Conversation About Food and the Recovery Process with Chef Sandra Bradley" },
        ]}
        description="The relationship between food and healing is a significant one. For those in substance abuse or addiction recovery, nutrition becomes all the more essential to this process of restoration. Recently, studies have shown the…"
        image="/hero/resident-reading-window.jpg"
        width="narrow"
      />

      <article className="py-16 lg:py-24 bg-white">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ fontFamily: 'var(--font-body)' }}>

            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"How Does Nutrition Impact Addiction Recovery?"}
            </h2>
            <p className="text-sm text-foreground/80 leading-relaxed mb-6">
              {"The relationship between food and healing is a significant one. For those in substance abuse or addiction recovery, nutrition becomes all the more essential to this process of restoration. Recently, studies have shown the important role that gut biome health and nutrition have on neurological responses—and this is just the beginning."}
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed mb-10">
              {"At Seven Arrows Recovery, we understand this important relationship between nutrition and the healing process. When interviewed about the role of food and addiction recovery, Seven Arrows chef, Sandra Bradley, agrees and explains:"}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"“We’re learning so much about the importance of the gut and its connection to everything in so many aspects of our well-being and our health—both our mental health, as well as our physical health. It’s just intrinsically natural that the more that we learn about that connection, the more important an emphasis is going to be placed on food in recovery.”"}
            </p>
            <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 mt-8" style={{ fontFamily: 'var(--font-display)' }}>
              {"But How Did Nutrition Become So Neglected?"}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"If nutrition is so important to both our physical and mental health, why is it so hard to maintain? Chef Bradley, who has a degree in rangeland ecology and management, attributes some of this neglect to the food culture rampant in the US today. Acknowledging that the “wellness industry is a billion dollar industry” and is often dependent on a person’s access to such resources, Bradley highlights some of the barriers to healthy living:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"The ability to buy organic produce"}</li>
              <li>{"The ability to buy locally sourced products"}</li>
              <li>{"The ability to buy food that you actually want to be putting in your body"}</li>
              <li>{"Having the time to research where your food is coming from"}</li>
              <li>{"The ability to spend time focusing on preparation"}</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Socio-economic status and barriers in the system itself also make it difficult for low-income populations to even get access to nutritional basics. Agricultural practices which are supported by governmental subsidies, as Bradley explains, end up allowing “manufacturers to produce [certain crops] cheaply…and in turn, they can sell a 99 cent hamburger.”"}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"But the situation is anything but hopeless."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"What’s Different about Seven Arrows Recovery Nutrition?"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"At Seven Arrows’ kitchen and garden, practicing regenerative agriculture is a value that moves in the direction of creating sustainable, healthy food, but also works against some of the monocropping practices highlighted by Bradley."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"When asked about some of her favorite go-to ingredients, Bradley immediately highlights the accessibility to garden ingredients. She says:"}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"“Being here at Seven Arrows and having access to our garden and our growing garden, it’s really lovely to be able to walk out and pick fresh basil and add that on top of a piece of sauteed salmon with balsamic vinegar reduction and cherry tomatoes.”"}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Furthermore, gardening isn’t just about the ingredients you get from it. The practice of gardening, especially for those in addiction and substance abuse recovery has a subtle way of teaching and healing. Chef Bradley points to five of the areas that gardening can affect for someone in recovery:"}
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8 text-foreground/80 leading-relaxed">
              <li>{"Having the faith to see something that you can’t see"}</li>
              <li>{"Having to plant and to tend to, and to nurture"}</li>
              <li>{"The step-by-step process"}</li>
              <li>{"The meditative aspect of weeding"}</li>
              <li>{"The peaceful elements of being in a garden and growing things"}</li>
            </ul>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"From Healing to the Kitchen"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"When asked about her background and inspiration for what she does now, Bradley emphasizes her time spent outdoors as a child, which “instilled a very strong sense of land stewardship, and appreciation for wildlife and our natural resources.” She later applied these interests in her educational and professional endeavors: first, by studying range land ecology and wildlife and fishery science; and second, by pursuing her culinary degree at the Texas Culinary Academy."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Having spent time as a client at Seven Arrows Recovery, Bradley understands what it’s like to experience detox and the recovery process. During the early stages of recovery, Bradley explains that “food had become an enemy” during the peak of her addiction, which left her unable to eat in the mornings. Understanding that she needed basic nutrients, Bradley got creative and started using smoothies and shakes to get back to square one."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"“Once I came to Seven Arrows and I’d gone through my detox period,” Bradley explains, “I started craving food again, and I hadn’t wanted to eat or eat nutritionally and on a nutritious basis in such a long time.” Paired with her personal experiences, values, and professional experience, Chef Bradley has partnered with Seven Arrows to bring others into that healing process by way of nutrition and delicious meals."}
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 mt-12" style={{ fontFamily: 'var(--font-display)' }}>
              {"Healing Food, Making Relationships"}
            </h2>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"For Seven Arrows, building relationships is also a central piece of healthy living and sustainable food practices. When working with farmers and ranchers of locally-sourced meats, Bradley says, “we’re going to get to know these people by their first names and we’re going to be supporting their community and their interests and their businesses and eventually they’ll be supporting us as well.”"}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"With partnerships like Desert Sky Produce and Sky Island, seasonal produce becomes sustainable and life-giving—for both local farmers and Seven Arrows clients alike. Bradley’s menus are an homage to what is growing in its season and “what is just coming out of (literally) our backyard, our kitchen, and our community garden.” For Bradley, seasonal crops and creative menus are what keep this creativity alive."}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"When it’s all said and done, Chef Bradley summarizes her approach to cooking as one of “inspiring passion in the areas of health, wellness, and creativity” Moreover, she says, it’s about “the level of love that you not only see with the ingredients and where they came from, but the level of love that you put into the cooking and to what you make and how you make it.”"}
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {"Between its regenerative gardening practices, relationships with local farmers, and nutritional values facilitated by an expert, Seven Arrows Recovery has the perfect recipe for wholeness and healing."}
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
                <strong className="text-foreground/70">This is Episode 28 of &ldquo;The Recovery Roadmap&rdquo;</strong> &mdash; an investigative series from Seven Arrows Recovery guiding you from recognition to lasting recovery.
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
