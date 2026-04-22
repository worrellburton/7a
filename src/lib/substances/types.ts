// Shared shape for every substance-page content file. A page is a
// server component that imports this type, fills it in with
// substance-specific content, and passes the content to the reusable
// 10-phase substance framework in src/components/substance/*.
//
// Every field here maps 1:1 to a visible phase on the page — the idea
// is that the framework stays shared and the content does the
// differentiation (so a user reading about heroin does not see the
// cocaine reward curve labels, but the same animation language binds
// the whole series together visually).

export interface SubstanceReward {
  eyebrow: string;
  title: React.ReactNode;
  paragraphs: string[];
  chart: {
    natural: { label: string; color: string };
    spike: { label: string; color: string };
    flatline: { label: string; color: string };
    yAxisLabel?: string;
  };
}

export interface SubstanceCycle {
  eyebrow: string;
  title: React.ReactNode;
  paragraphs: string[];
  stages: { label: string; hint: string }[]; // typically 4
}

export interface SubstanceBodyStat {
  value: number;
  suffix?: string;
  label: string;
  body: string;
}

export interface SubstanceBody {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  stats: SubstanceBodyStat[]; // typically 3
  footnote?: string;
}

export interface SubstanceWithdrawalPhase {
  label: string;
  days: string;
  body: string;
}

export interface SubstanceWithdrawal {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  phases: SubstanceWithdrawalPhase[]; // exactly 4
}

export interface SubstancePersona {
  label: string;
  headline: string;
  body: string;
}

export interface SubstancePersonas {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  personas: SubstancePersona[]; // 4 or 5
}

export interface SubstanceModality {
  title: string;
  body: string;
  iconId: ModalityIconId;
}

export type ModalityIconId =
  | 'brain-body'
  | 'heart'
  | 'trophy'
  | 'spiral'
  | 'horse'
  | 'breath'
  | 'duo'
  | 'shield'
  | 'compass'
  | 'hands';

export interface SubstanceApproach {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  flagship: SubstanceModality;
  modalities: SubstanceModality[]; // typically 6
}

export interface SubstanceRewiringAnchor {
  x: number; // 0..1 along the curve
  label: string;
  hint: string;
}

export interface SubstanceRewiring {
  eyebrow: string;
  title: React.ReactNode;
  paragraphs: string[];
  anchors: SubstanceRewiringAnchor[]; // typically 4
}

export interface SubstanceVoice {
  quote: string;
  attribution: string;
  photo: string;
}

export interface SubstanceVoices {
  eyebrow: string;
  title: React.ReactNode;
  body?: string;
  voices: SubstanceVoice[]; // typically 3
}

export interface SubstanceCTA {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
}

export interface SubstanceHero {
  label: string;
  title: string;
  description: string;
  breadcrumbs: { label: string; href?: string }[];
}

export interface SubstanceContent {
  hero: SubstanceHero;
  reward: SubstanceReward;
  cycle: SubstanceCycle;
  body: SubstanceBody;
  withdrawal: SubstanceWithdrawal;
  personas: SubstancePersonas;
  approach: SubstanceApproach;
  rewiring: SubstanceRewiring;
  voices: SubstanceVoices;
  cta: SubstanceCTA;
}
