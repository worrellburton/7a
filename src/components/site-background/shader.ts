// GLSL ES 3.00 fragment shader for the site-wide ambient background.
// Phase 2: just a soft radial brand-color gradient driven by the
// `u_resolution` + `u_time` uniforms. Phases 3-7 will layer the
// medallion ring, cross, beads, and atmospheric noise on top.
//
// All color math is done in linear space and tone-mapped at the end
// so future phases (additive medallion strokes, additive beads) can
// stack without blowing out highlights.

export const VERTEX_SHADER = /* glsl */ `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
// Pointer position normalized to [-1, 1] across the viewport. Smoothed
// on the JS side before being uploaded so the parallax never jitters.
uniform vec2 u_mouse;
// Page scroll offset normalized to [0, 1] across the document height.
uniform float u_scroll;

// Brand palette — terracotta primary, deep amber dark, warm tan.
// Stored linear-ish; final pass applies a soft gamma so the screen
// edges read warm rather than crushed.
const vec3 C_DEEP   = vec3(0.094, 0.039, 0.024); // ~ #181009 night earth
const vec3 C_AMBER  = vec3(0.737, 0.420, 0.290); // ~ #bc6b4a primary
const vec3 C_DUSK   = vec3(0.227, 0.094, 0.063); // ~ #3a1810 deep brown
const vec3 C_HORIZON = vec3(0.949, 0.851, 0.769); // ~ #f2d9c4 warm bg

// Signed-distance function for a single circle ring (annulus) of
// radius r and stroke half-width w. Returns the SDF value so the
// caller can antialias against fwidth.
float sdRing(vec2 p, float r, float w) {
  return abs(length(p) - r) - w;
}

// SDF for a horizontal segment from -halfLen..+halfLen along x with
// thickness w along y. Used twice (rotated) for the brand cross.
float sdSegment(vec2 p, float halfLen, float w) {
  vec2 d = abs(p) - vec2(halfLen, w);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

// SDF for a filled disc of radius r centered at the origin.
float sdDisc(vec2 p, float r) {
  return length(p) - r;
}

const float TAU = 6.28318530718;

// ── Cheap value-noise + 3-octave FBM ──────────────────────────────
// Used as a slow, almost-imperceptible warm haze drifting across the
// gradient. Three octaves keeps this affordable on mobile fragment
// budgets while still giving us soft, organic banding.

float hash21(vec2 p) {
  // sin-based hash — not cryptographic, but visually stable enough
  // for the low-amplitude haze layer.
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f); // smoothstep
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    v += amp * valueNoise(p);
    p *= 2.07;       // slight irrational ratio so octaves don't align
    amp *= 0.5;
  }
  return v;
}

void main() {
  // Center-anchored coordinates with aspect correction so the radial
  // hot-spot stays circular regardless of viewport shape.
  vec2 uv = v_uv;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float d = length(p);

  // Slow vertical breath — the gradient center drifts up and down
  // ~5% of the height over a 22s loop. Subtle enough to feel like
  // ambient atmosphere rather than animation.
  //
  // Phase 8 parallax: pointer pushes the center inversely (so the
  // medallion appears to "stay" while the world tilts under the
  // cursor) and scroll lifts it gently as the user moves down the
  // page. Both inputs come pre-smoothed from JS.
  float breath = sin(u_time * 0.28) * 0.05;
  vec2 parallax = vec2(-u_mouse.x * 0.04, -u_mouse.y * 0.025 + u_scroll * 0.18);
  vec2 center = vec2(0.0, 0.05 + breath) + parallax;
  float dr = length(p - center);

  // Two-stop radial: warm horizon glow at center → deep dusk at edges.
  vec3 col = mix(C_AMBER * 0.45 + C_HORIZON * 0.15, C_DUSK, smoothstep(0.0, 0.85, dr));
  // Pull the very far corners down toward C_DEEP for vignette.
  col = mix(col, C_DEEP, smoothstep(0.6, 1.4, d));

  // ── Medallion ring layer ───────────────────────────────────────
  // Single translucent ring centered on the breath-drifting hot-spot.
  // Antialiased via fwidth so the edge stays crisp at every DPR.
  vec2 mp = p - center;
  float ringR = 0.16;          // radius in aspect-normalized space
  float ringW = 0.0035;        // stroke half-width
  float ringSdf = sdRing(mp, ringR, ringW);
  float aaR = fwidth(ringSdf) * 0.75 + 1e-5;
  float ringMask = 1.0 - smoothstep(0.0, aaR, ringSdf);
  // Additive amber accent — sits on top of the gradient at low alpha
  // so it reads as a "ghost" of the brand mark, not a foreground asset.
  // Phase 10: bumped from 0.18 → 0.24 so on the rare occasion the
  // background is actually visible (overscroll, transparent gaps,
  // route transitions) the medallion has actual presence.
  col += C_AMBER * ringMask * 0.24;

  // ── 4-direction cross inside the medallion ────────────────────
  // Two perpendicular segments that span the diameter of the ring;
  // the brand mark's cardinal-direction cross. Stop the segments
  // just shy of the ring so the strokes never poke through.
  float crossHalf = ringR - ringW * 1.5;
  float crossW = 0.0028;
  float horizSdf = sdSegment(mp, crossHalf, crossW);
  float vertSdf  = sdSegment(mp.yx, crossHalf, crossW);
  float crossSdf = min(horizSdf, vertSdf);
  float aaC = fwidth(crossSdf) * 0.75 + 1e-5;
  float crossMask = 1.0 - smoothstep(0.0, aaC, crossSdf);
  col += C_AMBER * crossMask * 0.18;

  // ── Beaded fringe (7 dangling beads) ──────────────────────────
  // Seven beads dangle below the medallion in a soft fan, evoking the
  // brand mark's beaded chains. Bead i sits at angle a (range
  // [-fan/2, +fan/2] sweeping past straight-down), at radius
  // ringR + chainLen, with size that tapers slightly toward the
  // outermost beads for a natural drape.
  //
  // Phase 6 motion: each bead's angle gets a small phase-offset
  // pendulum sway driven by u_time so the chain feels like it's
  // breathing in a breeze. Inner beads sway less, outer beads sway
  // more — same intuition as a real chain. Period and amplitude
  // are deliberately quiet (~7s loop, ~3° peak).
  const int BEAD_COUNT = 7;
  float fan = 1.45;            // total angular fan, ~83°
  float chainLen = 0.075;      // distance from ring edge to bead center
  float beadR = 0.006;         // base bead radius
  float beadMaskAcc = 0.0;
  for (int i = 0; i < BEAD_COUNT; i++) {
    float t = float(i) / float(BEAD_COUNT - 1);    // 0..1
    float baseA = -3.14159265 * 0.5 + (t - 0.5) * fan;
    // Sway: outer beads (|t-0.5| larger) swing further. Phase is
    // staggered so the chain feels like a wave, not a rigid wing.
    float swayAmp = 0.05 * abs(t - 0.5) * 2.0;     // 0..0.05 rad (~2.9°)
    float sway = sin(u_time * 0.9 + t * 1.6) * swayAmp;
    float a = baseA + sway;
    vec2 bp = vec2(cos(a), sin(a)) * (ringR + chainLen);
    // Subtle taper — outer beads slightly smaller than the center bead.
    float taper = 1.0 - 0.25 * abs(t - 0.5) * 2.0;
    float r = beadR * taper;
    float sdf = sdDisc(mp - bp, r);
    float aaB = fwidth(sdf) * 0.75 + 1e-5;
    beadMaskAcc += 1.0 - smoothstep(0.0, aaB, sdf);
  }
  // Clamp so overlapping bead halos don't compound past full intensity.
  beadMaskAcc = clamp(beadMaskAcc, 0.0, 1.0);
  col += C_AMBER * beadMaskAcc * 0.22;

  // ── Atmospheric haze ──────────────────────────────────────────
  // 3-octave FBM scrolled slowly along x — soft warm bands that
  // drift across the screen like desert dust at dusk. Centered at 0
  // (subtract 0.5) so it pulls some pixels brighter and others dimmer
  // rather than just brightening everything.
  vec2 nq = p * 1.6 + vec2(u_time * 0.018, u_time * 0.005);
  float n = fbm(nq) - 0.5;
  // Mute the haze near the page edges so vignette stays clean.
  float edgeFade = 1.0 - smoothstep(0.55, 1.05, d);
  col += C_HORIZON * n * 0.06 * edgeFade;

  // Soft gamma so on-brand warmth survives the canvas → display path.
  col = pow(col, vec3(0.92));

  // Conservative output alpha. The host element sits at z-index -10,
  // so opacity here is the only knob that controls how visible the
  // atmosphere is in transparent gaps between sections.
  fragColor = vec4(col, 1.0);
}
`;
