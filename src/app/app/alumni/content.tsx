'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import HomeOnlineOrbit, { type OrbitHorse, type OrbitUser } from '../HomeOnlineOrbit';
import AlumniProfileEditor from './_components/AlumniProfileEditor';

// Alumni hub. The 6-tile shortcut grid was removed — alumni
// reach the sub-routes (map, meetups, peer support, etc.) from
// the sidebar nav, where each entry has a glyph. The hub itself
// is now the "who's around today" surface: alumni + staff + the
// horse roster orbiting at the center of the page, mirroring
// the dashboard /app shows to staff. Gives alumni an immediate
// sense of community presence the moment they sign in.

interface DbUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_sign_in: string | null;
  last_seen_at: string | null;
  last_path: string | null;
  job_title: string | null;
  user_kind: 'staff' | 'alumni' | 'guest' | null;
  status: 'active' | 'on_hold' | 'denied' | null;
}

interface DbHorse {
  id: string;
  name: string;
  image_url: string | null;
  works_in?: string | null;
}

export default function AlumniHubContent() {
  const { user, session } = useAuth();
  const [staff, setStaff] = useState<OrbitUser[]>([]);
  const [alumni, setAlumni] = useState<OrbitUser[]>([]);
  const [horses, setHorses] = useState<OrbitHorse[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    const data = await db({
      action: 'select',
      table: 'users',
      select: 'id, full_name, avatar_url, last_sign_in, last_seen_at, last_path, job_title, status, user_kind',
      order: { column: 'last_sign_in', ascending: false },
    }).catch(() => []);
    if (!Array.isArray(data)) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filtered = (data as DbUser[]).filter(
      (u) => (u.status == null || u.status === 'active') && u.last_sign_in && new Date(u.last_sign_in) >= today,
    );
    const toOrbit = (u: DbUser): OrbitUser => ({
      id: u.id,
      full_name: u.full_name,
      avatar_url: u.avatar_url,
      last_sign_in: u.last_sign_in,
      last_seen_at: u.last_seen_at,
      last_path: u.last_path,
      job_title: u.job_title,
    });
    setStaff(filtered.filter((u) => u.user_kind !== 'alumni').map(toOrbit));
    setAlumni(filtered.filter((u) => u.user_kind === 'alumni').map(toOrbit));

    const horseRows = await db({
      action: 'select',
      table: 'horses',
      select: 'id, name, image_url, works_in',
      order: { column: 'name', ascending: true },
    }).catch(() => []);
    if (Array.isArray(horseRows)) setHorses(horseRows as DbHorse[]);
  }, [session?.access_token]);
  useEffect(() => { void load(); }, [load]);

  const pathLabel = useCallback(() => null, []);
  const firstName = (user?.email ? user.email.split('@')[0] : '').replace(/\.|_/g, ' ');

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-8 lg:mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Alumni portal</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Welcome back{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="mt-1 text-sm text-foreground/65 max-w-2xl">
          The folks orbiting below are everyone who signed into Seven Arrows today — alumni on the outer ring,
          staff in the middle, the herd in the center. Use the sidebar to jump to the map, peer-support list,
          meetups, and the rest of the portal.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90"
          >
            ✎ Edit my alumni profile
          </button>
        </div>
      </header>

      {/* Today's orbit · alumni outer ring + staff middle + horses
          inner. Reuses the same HomeOnlineOrbit component the staff
          dashboard mounts on /app, so behavior + animations stay in
          lockstep across the two surfaces. */}
      <div className="flex justify-center px-2">
        <div className="w-full max-w-2xl">
          <HomeOnlineOrbit
            users={staff}
            alumni={alumni}
            horses={horses}
            pathLabelFor={pathLabel}
            highlightUserId={null}
          />
        </div>
      </div>

      {editorOpen && (
        <AlumniProfileEditor onClose={() => setEditorOpen(false)} />
      )}
    </div>
  );
}
