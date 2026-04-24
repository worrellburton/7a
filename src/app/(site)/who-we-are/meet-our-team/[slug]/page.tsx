import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import TeamMemberHero from '@/components/team-member/TeamMemberHero';
import TeamMemberBio from '@/components/team-member/TeamMemberBio';
import TeamMemberFavorites from '@/components/team-member/TeamMemberFavorites';
import TeamMemberFacts from '@/components/team-member/TeamMemberFacts';
import TeamMemberClosingCTA from '@/components/team-member/TeamMemberClosingCTA';
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
      <TeamMemberFacts member={member} />
      <MoreTeamMembers current={member} siblings={team} />
      <TeamMemberClosingCTA member={member} />
    </>
  );
}
