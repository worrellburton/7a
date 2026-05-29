'use client';

import { useMemo, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
} from '@vis.gl/react-google-maps';

// Google-Maps-backed alumni map. Each pin is the alum's own
// avatar (round, copper-ring) rendered as an AdvancedMarker —
// the map reads as a portrait gallery laid over Arizona instead
// of a generic blue-dot map.
//
// City centroids only (not exact addresses); multiple alumni in
// the same city share lat/lng so a deterministic jitter spreads
// their pins out by ~250m. Click a pin → InfoWindow with bio,
// interest chips, opt-in contact.

export interface AlumniMapPin {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  interests: string[];
  available_for: string[];
  phone: string | null;
  email_for_alumni: string | null;
  phone_visible: boolean;
  email_visible: boolean;
  text_ok: boolean;
  lat: number;
  lng: number;
}

// Pretty-print a 10-digit US phone; leave anything else untouched.
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return raw;
}

// Stable per-user jitter so pins in the same city don't perfectly
// stack on top of each other. ~250m radius; computed from the user
// uuid so repeated renders place the pin in the same spot.
function jitterFromId(id: string): [number, number] {
  let h1 = 0;
  let h2 = 0;
  for (let i = 0; i < id.length; i += 1) {
    h1 = (h1 * 31 + id.charCodeAt(i)) & 0xffffffff;
    h2 = (h2 * 37 + id.charCodeAt(i) * 7) & 0xffffffff;
  }
  const dx = ((h1 % 2000) / 1000 - 1) * 0.002;
  const dy = ((h2 % 2000) / 1000 - 1) * 0.002;
  return [dx, dy];
}

// Quiet, off-white styling so the alumni avatars are the focal
// point — defaults look fine but the desaturated road / land
// palette lets the copper marker rings pop.
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f7f3ee' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7d6e60' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f7f3ee' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dde8ef' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export default function AlumniMapCanvas({ pins }: { pins: AlumniMapPin[] }) {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY ||
    '';
  const [openId, setOpenId] = useState<string | null>(null);

  // Center + zoom: fit to the bounds of the pins. Single pin →
  // city-scale view; multi-pin → fit-to-bounds (computed once on
  // mount, the map stays interactive after).
  const { center, zoom } = useMemo(() => {
    if (pins.length === 0) return { center: { lat: 34, lng: -111.5 }, zoom: 6 };
    if (pins.length === 1) return { center: { lat: pins[0].lat, lng: pins[0].lng }, zoom: 9 };
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const p of pins) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }
    return {
      center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 },
      // Rough zoom that fits a state-sized bound; the map will
      // also auto-fit if we ever need to be more precise.
      zoom: 6,
    };
  }, [pins]);

  if (!apiKey) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 text-center">
        <p className="text-[12.5px] font-semibold text-amber-900">Google Maps API key missing</p>
        <p className="mt-1 text-[11.5px] text-amber-900/75">
          Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in the environment to render the alumni map.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-black/10 bg-warm-bg/30">
      <APIProvider apiKey={apiKey}>
        <Map
          mapId="alumni-map"
          defaultCenter={center}
          defaultZoom={zoom}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          styles={MAP_STYLES}
          style={{ height: '60vh', minHeight: 420, width: '100%' }}
        >
          {pins.map((p) => {
            const [dx, dy] = jitterFromId(p.user_id);
            const position = { lat: p.lat + dy, lng: p.lng + dx };
            return (
              <AdvancedMarker
                key={p.user_id}
                position={position}
                onClick={() => setOpenId(p.user_id)}
                title={p.full_name || p.city || 'Alumni'}
              >
                <AvatarPin name={p.full_name} avatarUrl={p.avatar_url} />
                {openId === p.user_id && (
                  <InfoWindow
                    position={position}
                    onCloseClick={() => setOpenId(null)}
                    pixelOffset={[0, -42]}
                  >
                    <PinPopup pin={p} />
                  </InfoWindow>
                )}
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>
    </div>
  );
}

// Round avatar pin · copper ring + soft drop shadow. Falls back
// to an initial badge when the user has no avatar uploaded. The
// triangular tail under the photo makes it read as a "pin" rather
// than a floating headshot.
function AvatarPin({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div style={{ position: 'relative', width: 44, height: 52 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 9999,
          border: '3px solid #bc6b4a',
          background: '#fff',
          overflow: 'hidden',
          boxShadow: '0 6px 16px -6px rgba(60,40,30,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name || ''}
            referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontWeight: 700, color: '#bc6b4a', fontSize: 16, fontFamily: 'var(--font-body)' }}>
            {initial}
          </span>
        )}
      </div>
      {/* Pin tail */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: 38,
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '10px solid #bc6b4a',
          filter: 'drop-shadow(0 2px 2px rgba(60,40,30,0.35))',
        }}
      />
    </div>
  );
}

function PinPopup({ pin }: { pin: AlumniMapPin }) {
  return (
    <div style={{ fontFamily: 'var(--font-body)', maxWidth: 280, padding: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        {pin.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pin.avatar_url}
            alt={pin.full_name || ''}
            referrerPolicy="no-referrer"
            style={{ width: 40, height: 40, borderRadius: 9999, objectFit: 'cover', border: '2px solid #bc6b4a' }}
          />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: 9999, border: '2px solid #bc6b4a',
            background: 'rgba(188,107,74,0.08)', color: '#bc6b4a', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>
            {(pin.full_name || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          {pin.full_name && (
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>
              {pin.full_name}
            </p>
          )}
          {(pin.city || pin.state) && (
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bc6b4a', margin: 0, marginTop: 2 }}>
              {[pin.city, pin.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>
      {pin.bio && (
        <p style={{ fontSize: 12.5, color: 'rgba(26,26,26,0.78)', margin: 0, marginBottom: 8, lineHeight: 1.5, maxHeight: 160, overflowY: 'auto' }}>
          {pin.bio}
        </p>
      )}
      {(pin.interests.length > 0 || pin.available_for.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {pin.interests.map((t) => (
            <span key={`i-${t}`} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(188,107,74,0.1)', color: '#bc6b4a', padding: '2px 6px', borderRadius: 4 }}>{t}</span>
          ))}
          {pin.available_for.map((t) => (
            <span key={`a-${t}`} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(16,185,129,0.1)', color: '#047857', padding: '2px 6px', borderRadius: 4 }}>{t}</span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {pin.phone_visible && pin.phone && (
          <a
            href={`tel:${pin.phone.replace(/[^\d+]/g, '')}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: '1px solid rgba(188,107,74,0.45)',
              background: 'linear-gradient(135deg, rgba(188,107,74,0.16), rgba(188,107,74,0.04))',
              color: '#bc6b4a', fontWeight: 700, fontSize: 13.5,
              padding: '7px 12px', borderRadius: 12, textDecoration: 'none',
              boxShadow: '0 0 16px -4px rgba(188,107,74,0.6)',
            }}
            title={`Call ${formatPhone(pin.phone)}`}
          >
            <span aria-hidden>📞</span>{formatPhone(pin.phone)}
          </a>
        )}
        {pin.phone_visible && pin.phone && pin.text_ok && (
          <a
            href={`sms:${pin.phone.replace(/[^\d+]/g, '')}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.08)',
              color: '#047857', fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
              letterSpacing: '0.06em', padding: '5px 10px', borderRadius: 9999, textDecoration: 'none',
            }}
            title="Open to texts anytime"
          >
            <span aria-hidden>💬</span> Text anytime
          </a>
        )}
        {pin.email_visible && pin.email_for_alumni && (
          <a
            href={`mailto:${pin.email_for_alumni}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              border: '1px solid rgba(0,0,0,0.1)', background: '#fff',
              color: 'rgba(26,26,26,0.7)', fontWeight: 600, fontSize: 12,
              padding: '7px 11px', borderRadius: 12, textDecoration: 'none',
            }}
          >
            <span aria-hidden>✉️</span> Email
          </a>
        )}
        {!pin.phone_visible && !pin.email_visible && (
          <span style={{ color: 'rgba(26,26,26,0.45)', fontStyle: 'italic', fontSize: 12 }}>Contact via Feather chat</span>
        )}
      </div>
    </div>
  );
}
