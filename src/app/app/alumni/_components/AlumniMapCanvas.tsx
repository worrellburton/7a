'use client';

import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

// Interactive Leaflet map showing alumni who've opted in. Tiles
// come from OpenStreetMap (no API key, free for low-volume use,
// attribution required per their TOS — rendered inline below).
//
// City centroids only (not exact addresses). Multiple alumni in
// the same city share lat/lng, so we apply a small deterministic
// jitter per user_id so their pins don't perfectly stack.

export interface AlumniMapPin {
  user_id: string;
  city: string | null;
  state: string | null;
  bio: string | null;
  interests: string[];
  available_for: string[];
  phone: string | null;
  email_for_alumni: string | null;
  phone_visible: boolean;
  email_visible: boolean;
  lat: number;
  lng: number;
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
  // Normalize to [-1, 1], scale to ~0.002 deg (~220m at the
  // equator, smaller at higher latitudes — close enough for the
  // visual de-duplication we want).
  const dx = ((h1 % 2000) / 1000 - 1) * 0.002;
  const dy = ((h2 % 2000) / 1000 - 1) * 0.002;
  return [dx, dy];
}

// Lucide-style feather glyph as the marker icon, copper. Builds a
// per-render Leaflet DivIcon so every marker reads as part of the
// Feather brand rather than the default blue pin.
const featherIcon = (() => {
  if (typeof window === 'undefined') return undefined;
  return L.divIcon({
    className: 'alumni-pin',
    html: `<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:#fff;border:2px solid #bc6b4a;box-shadow:0 4px 10px -3px rgba(60,40,30,0.45);">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bc6b4a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
        <line x1="16" y1="8" x2="2" y2="22"></line>
        <line x1="17.5" y1="15" x2="9" y2="15"></line>
      </svg>
    </span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
})();

// Auto-fit the map to the bounds of all pins on first render, with
// a polite zoom cap so a lone pin doesn't zoom in to street level.
function FitToPins({ pins }: { pins: AlumniMapPin[] }) {
  const map = useMap();
  useMemo(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 9);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 9 });
  }, [map, pins]);
  return null;
}

export default function AlumniMapCanvas({ pins }: { pins: AlumniMapPin[] }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-black/10 bg-warm-bg/30">
      <MapContainer
        center={[34, -111.5]}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: '60vh', minHeight: 420, width: '100%' }}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPins pins={pins} />
        {pins.map((p) => {
          const [dx, dy] = jitterFromId(p.user_id);
          return (
            <Marker
              key={p.user_id}
              position={[p.lat + dy, p.lng + dx]}
              icon={featherIcon}
            >
              <Popup>
                <div style={{ fontFamily: 'var(--font-body)', maxWidth: 260 }}>
                  {(p.city || p.state) && (
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bc6b4a', margin: 0, marginBottom: 4 }}>
                      {[p.city, p.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {p.bio && (
                    <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.78)', margin: 0, marginBottom: 8, lineHeight: 1.5 }}>
                      {p.bio}
                    </p>
                  )}
                  {(p.interests.length > 0 || p.available_for.length > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {p.interests.map((t) => (
                        <span key={`i-${t}`} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(188,107,74,0.1)', color: '#bc6b4a', padding: '2px 6px', borderRadius: 4 }}>{t}</span>
                      ))}
                      {p.available_for.map((t) => (
                        <span key={`a-${t}`} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(16,185,129,0.1)', color: '#047857', padding: '2px 6px', borderRadius: 4 }}>{t}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 12 }}>
                    {p.phone_visible && p.phone && (
                      <a href={`tel:${p.phone}`} style={{ color: '#bc6b4a', fontWeight: 600, textDecoration: 'none', marginRight: 12 }}>{p.phone}</a>
                    )}
                    {p.email_visible && p.email_for_alumni && (
                      <a href={`mailto:${p.email_for_alumni}`} style={{ color: '#bc6b4a', fontWeight: 600, textDecoration: 'none' }}>{p.email_for_alumni}</a>
                    )}
                    {!p.phone_visible && !p.email_visible && (
                      <span style={{ color: 'rgba(26,26,26,0.45)', fontStyle: 'italic' }}>Contact via Feather chat</span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
