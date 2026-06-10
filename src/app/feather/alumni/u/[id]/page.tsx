import AlumniProfileViewContent from './content';

// Per-alumnus profile page. Renders read-only public-facing details
// for a single alumnus — name, avatar, location, sobriety badge if
// public, bio, interests, available_for, and contact links that
// only surface when the alum opted in (phone_visible / email_visible).
//
// Reachable from: the reunion guest list pill chips, the alumni
// "Online today" list, and (eventually) the map pin popup. Gated to
// alumni + staff via PagePermissions (alumniOnly: true). The actual
// PII gating happens at the API layer — phone / email / sobriety
// are only sent over the wire when the alum opted them in.

export default async function AlumniProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AlumniProfileViewContent userId={id} />;
}
