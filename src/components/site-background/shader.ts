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

void main() {
  // Center-anchored coordinates with aspect correction so the radial
  // hot-spot stays circular regardless of viewport shape.
  vec2 uv = v_uv;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float d = length(p);

  // Slow vertical breath — the gradient center drifts up and down
  // ~5% of the height over a 22s loop. Subtle enough to feel like
  // ambient atmosphere rather than animation.
  float breath = sin(u_time * 0.28) * 0.05;
  vec2 center = vec2(0.0, 0.05 + breath);
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
  col += C_AMBER * ringMask * 0.18;

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
  col += C_AMBER * crossMask * 0.14;

  // Soft gamma so on-brand warmth survives the canvas → display path.
  col = pow(col, vec3(0.92));

  // Conservative output alpha. The host element sits at z-index -10,
  // so opacity here is the only knob that controls how visible the
  // atmosphere is in transparent gaps between sections.
  fragColor = vec4(col, 1.0);
}
`;
