import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchPublicTeam, fetchTeamMemberBySlug } from '@/lib/team';

export const revalidate = 60;
export const dynamicParams = true;

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const member = await fetchTeamMemberBySlug(slug);
  if (!member) return { title: 'Team Member' };
  const title = member.job_title ? `${member.full_name} — ${member.job_title}` : member.full_name;
  return {
    title,
    description: member.bio || `Meet ${member.full_name} of the Seven Arrows Recovery team.`,
  };
}

export default async function TeamMemberPage({ params }: RouteParams) {
  const { slug } = await params;
  const member = await fetchTeamMemberBySlug(slug);
  if (!member) notFound();

  const team = await fetchPublicTeam();
  const others = team.filter((m) => m.id !== member.id).slice(0, 4);

  return (
    <>
      <section className="bg-warm-bg py-12 lg:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/who-we-are/meet-our-team"
            className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-primary mb-8 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to team
          </Link>

          <div className="grid md:grid-cols-[minmax(0,320px)_1fr] gap-8 lg:gap-12 items-start">
            <div className="rounded-3xl overflow-hidden shadow-md bg-white aspect-[4/5] relative">
              {member.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.avatar_url}
                  alt={member.full_name}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-primary/30 text-7xl font-bold">
                  {member.full_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <p className="section-label mb-3" style={{ color: 'var(--color-primary)' }}>
                Our Team
              </p>
              <h1 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-3">
                {member.full_name}
              </h1>
              {member.job_title && (
                <p
                  className="text-primary text-lg font-semibold mb-6"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {member.job_title}
                </p>
              )}
              {member.bio ? (
                <div
                  className="text-foreground/75 text-base lg:text-lg leading-relaxed whitespace-pre-line"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {member.bio}
                </div>
              ) : (
                <p
                  className="text-foreground/60 italic"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Bio coming soon.
                </p>
              )}

              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <a href="tel:8669964308" className="btn-primary">
                  Call (866) 996-4308
                </a>
                <Link href="/contact" className="btn-outline">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {others.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="section-label mb-2">More of the Team</p>
                <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
                  Meet others on the team
                </h2>
              </div>
              <Link
                href="/who-we-are/meet-our-team"
                className="hidden sm:inline-flex text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                View all →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {others.map((m) => (
                <Link
                  key={m.id}
                  href={`/who-we-are/meet-our-team/${m.slug}`}
                  className="group bg-warm-bg rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="relative aspect-[4/5]">
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.avatar_url}
                        alt={m.full_name}
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-primary/40 text-5xl font-bold">
                        {m.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {m.full_name}
                    </h3>
                    {m.job_title && (
                      <p
                        className="text-primary/80 font-semibold text-xs mt-1"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {m.job_title}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
