import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  fetchPublicTeam,
  fetchPublicTeamMemberBySlug,
  type PublicTeamMember,
} from '@/lib/team';

interface Params {
  params: Promise<{ slug: string }>;
}

// Short ISR window so admin reorder, photo change, or bio edit shows
// up on the next page view rather than after a long stale cache.
export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const team = await fetchPublicTeam();
    return team.map((m) => ({ slug: m.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const member = await fetchPublicTeamMemberBySlug(slug);
  if (!member) {
    return { title: 'Team Member Not Found | Seven Arrows Recovery' };
  }
  const titlePiece = member.job_title
    ? `${member.job_title} · Seven Arrows Recovery`
    : 'Seven Arrows Recovery';
  return {
    title: `${member.full_name} · ${titlePiece}`,
    description:
      (member.bio || '').slice(0, 180) ||
      `Meet ${member.full_name}${member.job_title ? `, ${member.job_title},` : ''} at Seven Arrows Recovery.`,
  };
}

/**
 * Public team-member detail page. Deliberately a single, self-
 * contained server component: each section either renders (when its
 * field is filled) or it doesn't — no `useInView` fade-in gates that
 * could leave a section invisible-but-taking-space, no big min-heights
 * that produced the empty brown gradient slab on mobile, no client-
 * side animation choreography to debug.
 */
export default async function TeamMemberPage({ params }: Params) {
  const { slug } = await params;
  const [member, team] = await Promise.all([
    fetchPublicTeamMemberBySlug(slug),
    fetchPublicTeam(),
  ]);
  if (!member) notFound();

  const firstName = member.full_name.split(' ')[0];
  const siblings = team.filter((m) => m.id !== member.id).slice(0, 6);
  const facts = member.interesting_facts.filter(
    (f) => f.answer.trim().length > 0,
  );
  const hasFavoriteQuote = Boolean(member.favorite_quote?.trim());
  const hasFavoriteSeven = Boolean(member.favorite_seven_arrows?.trim());

  return (
    <article style={{ fontFamily: 'var(--font-body)' }}>
      {/* ───── HERO ───────────────────────────────────────────── */}
      <section
        className="relative text-white"
        aria-labelledby="team-member-heading"
        style={{
          marginTop: 'calc(var(--site-header-height, 68px) * -1)',
          background:
            'linear-gradient(150deg, var(--color-dark-section) 0%, var(--color-primary-dark) 60%, var(--color-primary) 100%)',
        }}
      >
        <div
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 lg:pb-20"
          style={{ paddingTop: 'calc(var(--site-header-height, 68px) + 2.5rem)' }}
        >
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/65 mb-6">
            <Link href="/who-we-are/meet-our-team" className="hover:text-white">
              Our Team
            </Link>
          </p>

          <div className="grid lg:grid-cols-[minmax(0,420px)_1fr] gap-8 lg:gap-14 items-center">
            {/* Portrait */}
            <div className="w-full max-w-[420px] mx-auto lg:mx-0">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-primary-dark/40">
                {member.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={member.avatar_url}
                    alt={member.full_name}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/70 text-7xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Identity + CTAs */}
            <div>
              <h1
                id="team-member-heading"
                className="font-bold tracking-tight"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
                  lineHeight: 1.05,
                }}
              >
                {member.full_name}
              </h1>

              {(member.job_title || member.hometown) && (
                <p className="mt-3 text-white/85 text-base sm:text-lg">
                  {member.job_title}
                  {member.job_title && member.hometown && (
                    <span className="text-white/40 mx-2">·</span>
                  )}
                  {member.hometown}
                </p>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="tel:+18669964308"
                  className="inline-flex items-center gap-2 bg-white text-primary-dark hover:bg-warm-bg rounded-full px-6 py-3 text-sm font-semibold transition-colors"
                >
                  Call (866) 996-4308
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 border border-white/35 hover:border-white text-white hover:bg-white/10 rounded-full px-6 py-3 text-sm font-semibold transition-colors"
                >
                  Contact Seven Arrows
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── BIO ────────────────────────────────────────────── */}
      {member.bio && (
        <section className="bg-white py-16 lg:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary mb-3">
              About
            </p>
            <h2
              className="font-bold tracking-tight text-foreground mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                lineHeight: 1.15,
              }}
            >
              Get to know {firstName}.
            </h2>
            <p className="text-foreground/80 text-base sm:text-lg leading-relaxed whitespace-pre-line">
              {member.bio}
            </p>
          </div>
        </section>
      )}

      {/* ───── FAVORITES (quote + why-I-love) ─────────────────── */}
      {(hasFavoriteQuote || hasFavoriteSeven) && (
        <section className="bg-warm-bg py-16 lg:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary mb-8">
              In {firstName}&rsquo;s own words
            </p>
            <div className="grid md:grid-cols-2 gap-5">
              {hasFavoriteQuote && (
                <article
                  className="rounded-2xl p-8 lg:p-10 text-white"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
                  }}
                >
                  <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-accent mb-4">
                    Favorite Quote
                  </p>
                  <blockquote
                    className="leading-snug"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.2rem, 1.8vw, 1.6rem)',
                    }}
                  >
                    {member.favorite_quote}
                  </blockquote>
                </article>
              )}

              {hasFavoriteSeven && (
                <article className="rounded-2xl p-8 lg:p-10 bg-white border border-black/5">
                  <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-primary mb-4">
                    Why I Love Seven Arrows
                  </p>
                  <p
                    className="text-foreground leading-relaxed"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.05rem, 1.5vw, 1.3rem)',
                      lineHeight: 1.4,
                    }}
                  >
                    {member.favorite_seven_arrows}
                  </p>
                </article>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ───── INTERESTING FACTS ──────────────────────────────── */}
      {facts.length > 0 && (
        <section className="bg-white py-16 lg:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary mb-8">
              A few things about {firstName}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {facts.map((fact, i) => (
                <article
                  key={`${fact.prompt}-${i}`}
                  className="rounded-2xl bg-warm-bg border border-black/5 p-6"
                >
                  <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary mb-2">
                    {fact.prompt.replace(/[…\.]+$/, '').trim()}
                  </p>
                  <p
                    className="text-foreground leading-snug"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.05rem, 1.4vw, 1.25rem)',
                      lineHeight: 1.35,
                    }}
                  >
                    {fact.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───── MEET THE REST OF THE TEAM ──────────────────────── */}
      {siblings.length > 0 && (
        <section className="bg-warm-bg py-16 lg:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary mb-2">
                  More of the team
                </p>
                <h2
                  className="font-bold tracking-tight text-foreground"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.4rem, 2.6vw, 2rem)',
                  }}
                >
                  Meet the rest of the team.
                </h2>
              </div>
              <Link
                href="/who-we-are/meet-our-team"
                className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark"
              >
                See the whole team →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {siblings.map((s) => (
                <SiblingCard key={s.id} member={s} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───── CLOSING CTA ────────────────────────────────────── */}
      <section
        className="text-white"
        style={{
          background:
            'linear-gradient(150deg, var(--color-dark-section) 0%, var(--color-primary-dark) 60%, var(--color-primary) 100%)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-4">
            Work with {firstName}
          </p>
          <h2
            className="font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 3.6vw, 2.6rem)',
              lineHeight: 1.1,
            }}
          >
            Ready to begin your recovery?
          </h2>
          <p className="text-white/85 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Our admissions team will walk you through intake and insurance
            verification, often within 24 to 48 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href="tel:+18669964308"
              className="inline-flex items-center gap-2 bg-white text-primary-dark hover:bg-warm-bg rounded-full px-7 py-3.5 text-sm font-semibold transition-colors"
            >
              Call (866) 996-4308
            </a>
            <Link
              href="/admissions#verify"
              className="inline-flex items-center gap-2 border border-white/35 hover:border-white text-white hover:bg-white/10 rounded-full px-7 py-3.5 text-sm font-semibold transition-colors"
            >
              Verify Insurance
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}

function SiblingCard({ member }: { member: PublicTeamMember }) {
  return (
    <Link
      href={`/who-we-are/meet-our-team/${member.slug}`}
      className="group block rounded-xl overflow-hidden bg-white border border-black/5 hover:border-primary/30 transition-colors"
    >
      <div className="aspect-[4/5] bg-warm-card relative">
        {member.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={member.avatar_url}
            alt={member.full_name}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-primary text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            {member.full_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="px-3 py-3">
        <p className="text-sm font-semibold text-foreground truncate">{member.full_name}</p>
        {member.job_title && (
          <p className="text-[11px] text-foreground/55 truncate">{member.job_title}</p>
        )}
      </div>
    </Link>
  );
}
