import AlumniPageBanner from './_components/AlumniPageBanner';

// Shared layout for every page under /app/alumni/*. The banner
// at the top tells super admins (who can now see these pages
// for administration) that they're inside the alumni portal,
// and reads as a section header for alumni themselves so the
// pages all feel like one place.

export default function AlumniLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AlumniPageBanner />
      {children}
    </>
  );
}
