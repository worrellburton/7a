import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import TeamMemberHero from '@/components/team-member/TeamMemberHero';
import TeamMemberBio from '@/components/team-member/TeamMemberBio';
import TeamMemberFavorites from '@/components/team-member/TeamMemberFavorites';
import MoreTeamMembers from '@/components/team-member/MoreTeamMembers';
import { fetchPublicTeam, fetchPublicTeamMemberBySlug } from '@/lib/team';

interface Params {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

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
  const titlePiece = member.job_title ? `${member.job_title} · Seven Arrows Recovery` : 'Seven Arrows Recovery';
  return {
    title: `${member.full_name} · ${titlePiece}`,
    description:
      (member.bio || '').slice(0, 180) ||
      `Meet ${member.full_name}${member.job_title ? `, ${member.job_title},` : ''} at Seven Arrows Recovery.`,
  };
}

export default async function TeamMemberPage({ params }: Params) {
  const { slug } = await params;
  const [member, team] = await Promise.all([
    fetchPublicTeamMemberBySlug(slug),
    fetchPublicTeam(),
  ]);
  if (!member) notFound();

  return (
    <>
      <TeamMemberHero member={member} />
      <TeamMemberBio member={member} />
      <TeamMemberFavorites member={member} />
      <MoreTeamMembers current={member} siblings={team} />

      {/* Closing CTA — warm gradient close, mirrors the other 10-phase
          pages' sign-off aesthetic. */}
      <section className="relative overflow-hidden text-white" style={{ background: 'linear-gradient(150deg, var(--color-dark-section) 0%, var(--color-primary-dark) 60%, var(--color-primary) 100%)' }}>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 0%, rgba(216,137,102,0.25) 0%, rgba(216,137,102,0) 65%)' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 text-center">
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-6" style={{ fontFamily: 'var(--font-body)' }}>
            Work with {member.full_name.split(' ')[0]}
          </p>
          <h2
            className="font-bold tracking-tight mb-6 mx-auto max-w-3xl"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4.2vw, 3.2rem)', lineHeight: 1.05 }}
          >
            Ready to begin your recovery?
          </h2>
          <p className="text-white/85 text-lg leading-relaxed max-w-xl mx-auto mb-10" style={{ fontFamily: 'var(--font-body)' }}>
            Our admissions team will walk you through intake and insurance
            verification, often within 24 to 48 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="tel:+18669964308"
              className="inline-flex items-center gap-2 bg-white text-primary-dark hover:bg-warm-bg rounded-full px-8 py-4 text-sm font-semibold shadow-[0_24px_50px_-20px_rgba(0,0,0,0.7)] transition-all"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Call (866) 996-4308
            </a>
            <Link
              href="/admissions#verify"
              className="inline-flex items-center gap-2 border border-white/35 hover:border-white text-white hover:bg-white/10 rounded-full px-8 py-4 text-sm font-semibold transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Verify Insurance
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
