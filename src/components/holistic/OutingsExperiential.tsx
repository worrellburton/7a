import Link from 'next/link';

// Experiential therapy outings — replaces the older "A Day of Practice"
// fictional schedule and the "Credentialed practitioners, not adjunct
// staff" tile. Both surfaces were flagged by leadership: the schedule
// described practices we don't run, and the credentialed-staff card
// duplicated language we already carry on the team page. This block
// names the actual off-site programming clients participate in, with
// links to the public pages for each location so visitors can keep
// exploring without leaving our site.

interface Outing {
  name: string;
  body: string;
  href: string;
}

const OUTINGS: Outing[] = [
  {
    name: 'Chiricahua National Monument',
    body: 'Towering rhyolite pinnacles and shaded canyon trails — a full-day hike that pairs movement with awe.',
    href: 'https://www.nps.gov/chir/index.htm',
  },
  {
    name: 'Amerind Museum & Trails',
    body: 'A small, world-class museum of Indigenous art and archaeology with quiet desert trails out the back door.',
    href: 'https://amerind.org/',
  },
  {
    name: 'Bisbee Mine Tour',
    body: 'Underground at the historic Queen Mine — narrow lights, bracing temperatures, and the long shadow of Arizona industry.',
    href: 'https://queenminetour.com/',
  },
  {
    name: 'Tombstone',
    body: 'A walking afternoon in the Old West — frontier streets, courthouse, and the boardwalk.',
    href: 'https://tombstonechamber.com/',
  },
  {
    name: 'Sandhill Cranes at Whitewater Draw',
    body: 'Tens of thousands of cranes wintering in the Sulphur Springs Valley — a quiet pre-dawn outing with a long view.',
    href: 'https://www.azgfd.com/recreation/wildlife-viewing/whitewater-draw/',
  },
  {
    name: 'Stargazing at Kartchner Caverns',
    body: 'Dark-sky observation in a state park renowned for both its underground formations and its night sky.',
    href: 'https://azstateparks.com/kartchner/',
  },
  {
    name: 'Hiking Turkey Creek',
    body: 'Cottonwood-lined canyon hikes east of the Chiricahuas — water year-round, bird-rich, low-traffic.',
    href: 'https://www.fs.usda.gov/coronado',
  },
  {
    name: 'Cochise Stronghold & Campground',
    body: 'Granite domes and the protected canyon Cochise himself called home — day hikes, picnic lunches, and a real history walk.',
    href: 'https://www.fs.usda.gov/recarea/coronado/recreation/recarea/?recid=25502',
  },
];

export default function OutingsExperiential() {
  return (
    <section className="bg-white py-20 lg:py-28" aria-labelledby="outings-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p
            className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Experiential therapy · off-site
          </p>
          <h2
            id="outings-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.6vw, 2.8rem)',
              lineHeight: 1.05,
            }}
          >
            The land does part of the work.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Cochise County is one of the most varied corners of the American
            Southwest — alpine sky islands, Indigenous history, dark-sky
            preserves, and a quiet that is genuinely rare. We weave outings
            into the program so the body has somewhere new to be while the
            nervous system practices what it&rsquo;s learning indoors.
          </p>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {OUTINGS.map((o) => (
            <li
              key={o.name}
              className="group/outing relative rounded-2xl border border-black/10 bg-warm-bg/40 p-5 hover:bg-warm-bg/70 transition-colors"
            >
              <Link
                href={o.href}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                aria-label={`${o.name} — visit official site`}
              />
              <h3
                className="text-foreground font-semibold tracking-tight mb-2 flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', lineHeight: 1.15 }}
              >
                {o.name}
                <svg
                  className="w-3.5 h-3.5 text-foreground/35 group-hover/outing:text-primary transition-colors"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7m0-7L10 14m-3-7H4a1 1 0 00-1 1v13a1 1 0 001 1h13a1 1 0 001-1v-3" />
                </svg>
              </h3>
              <p
                className="text-foreground/70 text-sm leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {o.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
