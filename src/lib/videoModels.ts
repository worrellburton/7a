// Catalog of image-to-video models we expose on /app/video.
//
// Each model declares which durations / resolutions / aspect ratios it
// supports so the UI can drive its dropdowns off the selected model and
// so the server can validate the payload before forwarding to fal.ai.
//
// Prices below are USD estimates based on fal.ai's published per-second
// rates. Treat them as UI estimates only — authoritative billing is on
// fal.ai's dashboard and may drift as their pricing changes.

export interface VideoModel {
  id: string;
  label: string;
  endpoint: string;
  description: string;
  durations: number[];
  resolutions: string[];
  aspects: string[];
  pricePerSecondUSD: Record<string, number>;
}

export const VIDEO_MODELS: VideoModel[] = [
  {
    id: 'seedance-1-pro',
    label: 'Seedance 1.0 Pro',
    endpoint: 'fal-ai/bytedance/seedance/v1/pro/image-to-video',
    description:
      'ByteDance flagship — highest fidelity motion and detail. Slower and more expensive.',
    durations: [5, 10],
    resolutions: ['480p', '720p', '1080p'],
    aspects: ['auto', '16:9', '9:16', '1:1'],
    pricePerSecondUSD: {
      '480p': 0.062,
      '720p': 0.124,
      '1080p': 0.248,
    },
  },
  {
    id: 'seedance-1-lite',
    label: 'Seedance 1.0 Lite',
    endpoint: 'fal-ai/bytedance/seedance/v1/lite/image-to-video',
    description:
      'ByteDance lighter variant — faster and cheaper, good for iterating on prompts.',
    durations: [5, 10],
    resolutions: ['480p', '720p', '1080p'],
    aspects: ['auto', '16:9', '9:16', '1:1'],
    pricePerSecondUSD: {
      '480p': 0.018,
      '720p': 0.036,
      '1080p': 0.072,
    },
  },
];

export const DEFAULT_VIDEO_MODEL_ID = VIDEO_MODELS[0].id;

export function findVideoModel(id: string | null | undefined): VideoModel | null {
  if (!id) return null;
  return VIDEO_MODELS.find((m) => m.id === id) || null;
}

// Estimate the cost of a generation in USD. Returns null when we don't
// have a price row for the given resolution (e.g. a model that doesn't
// expose resolution as a lever at all).
export function estimateVideoCostUSD(
  model: VideoModel,
  durationSeconds: number | null | undefined,
  resolution: string | null | undefined,
): number | null {
  if (!durationSeconds) return null;
  const key = resolution || '';
  const rate = model.pricePerSecondUSD[key];
  if (rate == null) return null;
  return Math.round(rate * durationSeconds * 100) / 100;
}
