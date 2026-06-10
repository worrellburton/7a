// Salutogenic Uplifter · scenario bank + deterministic sequencing.
//
// Gameplay is turn-based multiple choice: on your turn your opponent's
// character is in a *state* (anxious, discouraged, …) and you pick one
// of four responses. Exactly one is ATTUNED — it meets the person where
// they actually are (the real salutogenic skill). The others are
// supportive-but-generic, flat, or an outright miss (toxic positivity,
// fixing, minimizing). Points reward attunement + speed, so the game
// trains the same instinct the program teaches: regulate, attune,
// empower.
//
// Both clients must generate the IDENTICAL scenario sequence for a
// match, so everything is derived from a shared seed via mulberry32 —
// no Math.random() anywhere in match logic.

export type Mood =
  | 'anxious'
  | 'discouraged'
  | 'overwhelmed'
  | 'isolated'
  | 'self-critical'
  | 'stuck'
  | 'tense'
  | 'doubting';

export type ChoiceQuality = 'attuned' | 'supportive' | 'flat' | 'miss';

export interface Choice {
  text: string;
  quality: ChoiceQuality;
}

export interface Scenario {
  mood: Mood;
  stateLabel: string;
  flavor: string;
  choices: Choice[]; // exactly 4, in canonical order; shuffled per-turn by seed
}

// Accent color per mood — drives the 3D character's aura tint + the
// state chip in the HUD so both players can read the state at a glance.
export const MOOD_COLORS: Record<Mood, string> = {
  anxious: '#e3a94c',
  discouraged: '#7d8cc4',
  overwhelmed: '#c47d7d',
  isolated: '#6fa3a0',
  'self-critical': '#b07db8',
  stuck: '#9a8f72',
  tense: '#d98f5f',
  doubting: '#8aa1c4',
};

export const SCENARIOS: Scenario[] = [
  {
    mood: 'anxious',
    stateLabel: 'Anxious',
    flavor: 'Their heart is racing before sharing in group. Shallow breath, eyes down.',
    choices: [
      { text: '“Let’s take one slow breath together first. I’m right here — no rush.”', quality: 'attuned' },
      { text: '“You’ve got this! You’re going to crush it!”', quality: 'supportive' },
      { text: '“Everyone gets nervous sometimes.”', quality: 'flat' },
      { text: '“Just don’t think about it. Overthinking is the real problem.”', quality: 'miss' },
    ],
  },
  {
    mood: 'discouraged',
    stateLabel: 'Discouraged',
    flavor: 'They slipped on a goal they set last week and think it erases everything.',
    choices: [
      { text: '“One hard day doesn’t undo your progress. Look how differently you handled it than you would have before.”', quality: 'attuned' },
      { text: '“Don’t be so hard on yourself, it’s fine.”', quality: 'flat' },
      { text: '“Chin up — tomorrow’s a new day!”', quality: 'supportive' },
      { text: '“Well, what did you do wrong? Let’s fix you.”', quality: 'miss' },
    ],
  },
  {
    mood: 'overwhelmed',
    stateLabel: 'Overwhelmed',
    flavor: 'Too many feelings at once. They can’t find the first thread to pull.',
    choices: [
      { text: '“We don’t have to solve all of it. What’s the one heaviest thing right now?”', quality: 'attuned' },
      { text: '“Have you tried making a to-do list?”', quality: 'flat' },
      { text: '“You’re strong, you’ll get through it like always!”', quality: 'supportive' },
      { text: '“Other people have it way worse, honestly.”', quality: 'miss' },
    ],
  },
  {
    mood: 'isolated',
    stateLabel: 'Isolated',
    flavor: 'They’ve been eating alone all week, convinced nobody would notice if they vanished.',
    choices: [
      { text: '“I noticed you weren’t at the fire last night — the circle isn’t the same without you. Sit with me?”', quality: 'attuned' },
      { text: '“You should really socialize more, it’s good for you.”', quality: 'miss' },
      { text: '“We all love you, you know that!”', quality: 'supportive' },
      { text: '“Loneliness is pretty common here.”', quality: 'flat' },
    ],
  },
  {
    mood: 'self-critical',
    stateLabel: 'Self-critical',
    flavor: 'Their inner voice is calling them broken, beyond repair.',
    choices: [
      { text: '“Would you ever talk to a friend the way you talk to yourself? You deserve that same kindness.”', quality: 'attuned' },
      { text: '“Stop it, you’re amazing, end of story!”', quality: 'supportive' },
      { text: '“Negative self-talk is a habit, they say.”', quality: 'flat' },
      { text: '“Honestly you kind of need thicker skin.”', quality: 'miss' },
    ],
  },
  {
    mood: 'stuck',
    stateLabel: 'Stuck',
    flavor: 'Same wall, third week in a row. They can’t see any path forward.',
    choices: [
      { text: '“Three weeks ago you couldn’t even name this wall. Naming it IS the path — what’s one inch forward look like?”', quality: 'attuned' },
      { text: '“It’ll click eventually, these things take time.”', quality: 'flat' },
      { text: '“Keep pushing, never give up!”', quality: 'supportive' },
      { text: '“Maybe this just isn’t for you.”', quality: 'miss' },
    ],
  },
  {
    mood: 'tense',
    stateLabel: 'Tense',
    flavor: 'Jaw clenched, shoulders at their ears. Their body got the memo before their mind did.',
    choices: [
      { text: '“Your shoulders are telling on you. Want to walk to the corral with me and shake it out?”', quality: 'attuned' },
      { text: '“Relax! It’s all good!”', quality: 'miss' },
      { text: '“You seem stressed. Stress is bad for you.”', quality: 'flat' },
      { text: '“Whatever it is, I believe in you!”', quality: 'supportive' },
    ],
  },
  {
    mood: 'doubting',
    stateLabel: 'Doubting',
    flavor: 'They’re wondering out loud if they even deserve to get better.',
    choices: [
      { text: '“The fact that you’re asking that question is proof you care about who you’re becoming. That person deserves everything.”', quality: 'attuned' },
      { text: '“Of course you do! Everyone does!”', quality: 'supportive' },
      { text: '“Doubt is part of the process.”', quality: 'flat' },
      { text: '“Deserve’s got nothing to do with it, just do the work.”', quality: 'miss' },
    ],
  },
  {
    mood: 'anxious',
    stateLabel: 'Anxious',
    flavor: 'Family call in an hour. They’re rehearsing disasters that haven’t happened.',
    choices: [
      { text: '“Your mind is time-traveling to a future that doesn’t exist. Feel your boots on this floor — you’re here, with me.”', quality: 'attuned' },
      { text: '“It’ll probably go great, don’t worry!”', quality: 'supportive' },
      { text: '“Calls with family are tough for everybody.”', quality: 'flat' },
      { text: '“If you panic now, the call will definitely go badly.”', quality: 'miss' },
    ],
  },
  {
    mood: 'discouraged',
    stateLabel: 'Discouraged',
    flavor: 'They compared their chapter one to someone else’s chapter twenty.',
    choices: [
      { text: '“You’re measuring your insides against their outsides. The only fair comparison is you, thirty days ago — and that person would be in awe of you.”', quality: 'attuned' },
      { text: '“Comparison is the thief of joy, you know.”', quality: 'flat' },
      { text: '“Forget them, you’re doing awesome!”', quality: 'supportive' },
      { text: '“Well, they do work harder than you.”', quality: 'miss' },
    ],
  },
  {
    mood: 'overwhelmed',
    stateLabel: 'Overwhelmed',
    flavor: 'Big emotions hit during equine work this morning and they’re still flooded.',
    choices: [
      { text: '“The horse didn’t judge what came up, and neither do I. Big feelings mean something real moved. Let it land.”', quality: 'attuned' },
      { text: '“Crying around horses happens to everyone here.”', quality: 'flat' },
      { text: '“You’re so brave for feeling your feelings!”', quality: 'supportive' },
      { text: '“You should probably keep it together better in sessions.”', quality: 'miss' },
    ],
  },
  {
    mood: 'isolated',
    stateLabel: 'Isolated',
    flavor: 'New arrival. Everyone seems to already know each other.',
    choices: [
      { text: '“First week is the hardest one. I saved you a seat at dinner — come tell me your story.”', quality: 'attuned' },
      { text: '“You’ll make friends eventually.”', quality: 'flat' },
      { text: '“This community is amazing, you’ll love it!”', quality: 'supportive' },
      { text: '“Try being more outgoing, people respond to that.”', quality: 'miss' },
    ],
  },
  {
    mood: 'self-critical',
    stateLabel: 'Self-critical',
    flavor: 'They keep apologizing for taking up space in group.',
    choices: [
      { text: '“What you shared today helped me more than you know. Your voice isn’t taking space — it’s making space.”', quality: 'attuned' },
      { text: '“No need to apologize so much!”', quality: 'flat' },
      { text: '“You’re literally the best part of group!”', quality: 'supportive' },
      { text: '“Yeah, the apologizing does get a bit much.”', quality: 'miss' },
    ],
  },
  {
    mood: 'stuck',
    stateLabel: 'Stuck',
    flavor: 'They know what they need to say in family session. They just can’t say it.',
    choices: [
      { text: '“You don’t have to say it perfectly. Say it badly — I’ll sit next to you while you do.”', quality: 'attuned' },
      { text: '“Honesty is the best policy.”', quality: 'flat' },
      { text: '“You’re ready, just rip the band-aid off!”', quality: 'supportive' },
      { text: '“If you can’t say it, maybe you don’t really mean it.”', quality: 'miss' },
    ],
  },
  {
    mood: 'tense',
    stateLabel: 'Tense',
    flavor: 'Conflict at morning circle left a charge in the air between them and a peer.',
    choices: [
      { text: '“That rupture clearly matters to you because the relationship matters. Repair is a skill — want to practice what you’d say?”', quality: 'attuned' },
      { text: '“Conflict is normal in community living.”', quality: 'flat' },
      { text: '“You were totally in the right, don’t sweat it!”', quality: 'miss' },
      { text: '“It’ll blow over, it always does!”', quality: 'supportive' },
    ],
  },
  {
    mood: 'doubting',
    stateLabel: 'Doubting',
    flavor: 'Leaving in two weeks. They’re scared the person they’ve become won’t survive out there.',
    choices: [
      { text: '“You didn’t borrow this growth from the ranch — you built it. It’s in you, and it travels.”', quality: 'attuned' },
      { text: '“Aftercare exists for a reason.”', quality: 'flat' },
      { text: '“You’re unstoppable now, nothing can touch you!”', quality: 'miss' },
      { text: '“We’re all rooting for you out there!”', quality: 'supportive' },
    ],
  },
];

// ── Deterministic sequencing ─────────────────────────────────

// mulberry32 — tiny seeded PRNG, identical output on both clients.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TurnScenario {
  scenario: Scenario;
  // Choice indices into the shuffled order the UI shows.
  order: number[];
}

// Build the full match sequence of scenarios (and per-turn shuffled
// choice order) from one shared seed. Walks a seeded shuffle of the
// bank and re-shuffles when it runs past the end, so long matches
// never show back-to-back repeats.
export function buildTurnSequence(seed: number, turns: number): TurnScenario[] {
  const rand = mulberry32(seed);
  const shuffled = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const out: TurnScenario[] = [];
  let deck: Scenario[] = [];
  for (let t = 0; t < turns; t++) {
    if (deck.length === 0) deck = shuffled(SCENARIOS);
    const scenario = deck.pop()!;
    out.push({ scenario, order: shuffled([0, 1, 2, 3]) });
  }
  return out;
}

// ── Scoring ──────────────────────────────────────────────────

export const BAR_MAX = 100;
export const TURN_SECONDS = 14;
export const MAX_TURNS = 24; // safety cap; timer score decides if hit

export function pointsFor(quality: ChoiceQuality, secondsLeft: number, streak: number): number {
  const base =
    quality === 'attuned' ? 16 :
    quality === 'supportive' ? 8 :
    quality === 'flat' ? 3 : 0;
  if (base === 0) return 0;
  // Speed bonus only for attuned picks — rewards reading the state
  // fast, not spamming the first button.
  const speed = quality === 'attuned' ? Math.round((secondsLeft / TURN_SECONDS) * 8) : 0;
  // Co-regulation combo: 3+ attuned in a row adds a flat bonus.
  const combo = quality === 'attuned' && streak >= 2 ? 6 : 0;
  return base + speed + combo;
}

export const QUALITY_FEEDBACK: Record<ChoiceQuality, { label: string; blurb: string }> = {
  attuned: { label: 'ATTUNED!', blurb: 'You met them exactly where they are.' },
  supportive: { label: 'Supportive', blurb: 'Kind — but generic. Attunement scores higher.' },
  flat: { label: 'Flat', blurb: 'Technically true. Nobody felt seen.' },
  miss: { label: 'Missed', blurb: 'Fixing, minimizing, or toxic positivity. Ouch.' },
};
