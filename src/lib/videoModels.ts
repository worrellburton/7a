// Catalog of image-to-video models we expose on /app/video.
//
// Each model declares:
//   - the fal.ai endpoint slug (queue.fal.run/<endpoint>)
//   - which durations / resolutions / aspect ratios the UI should surface
//   - how to translate our common { prompt, duration, resolution, aspect }
//     payload into the specific shape that model's fal.ai endpoint wants
//   - a cost estimator so we can preview spend before hitting "Generate"
//
// Prices are USD estimates based on fal.ai's published rates as of the
// most recent knowledge cutoff. Treat them as UI estimates only — the
// authoritative bill is on fal.ai's dashboard and drifts over time.
//
// Endpoint slugs for newer models (Seedance 2.x, some Kling 2.x tags) are
// best-guesses aligned with fal.ai's documented URL pattern. If fal
// responds 404 to a given endpoint, check the model's page in fal.ai's
// catalogue and patch the `endpoint` string below.

export type VideoPayloadParams = {
  imageUrl: string;
  prompt?: string;
  duration: number;
  resolution?: string | null;
  aspect?: string | null;
  seed?: number;
};

export interface VideoModel {
  id: string;
  label: string;
  family: string;
  endpoint: string;
  description: string;
  durations: number[];
  resolutions: string[];
  aspects: string[];
  buildPayload: (p: VideoPayloadParams) => Record<string, unknown>;
  estimateCostUSD: (
    duration: number | null | undefined,
    resolution: string | null | undefined,
  ) => number | null;
  // How long a generation typically takes from queue to completion, as a
  // rough UI estimate for the progress bar. Returns seconds. Not
  // authoritative — fal queue depth + current load dominate in practice.
  typicalSeconds: (
    duration: number | null | undefined,
    resolution: string | null | undefined,
  ) => number;
}

// ─── shared helpers ───────────────────────────────────────────────────

// $/second pricing tables for models that scale with resolution. Each
// entry maps a UI resolution label to cost-per-second.
function perSecondTable(table: Record<string, number>) {
  return (duration: number | null | undefined, resolution: string | null | undefined) => {
    if (!duration) return null;
    const rate = resolution ? table[resolution] : null;
    if (rate == null) return null;
    return Math.round(rate * duration * 100) / 100;
  };
}

// Some models charge a flat per-generation rate that scales only with
// duration, not resolution.
function perSecondFlat(rate: number) {
  return (duration: number | null | undefined, _res: string | null | undefined) => {
    if (!duration) return null;
    return Math.round(rate * duration * 100) / 100;
  };
}

function flatPerGeneration(price: number) {
  return () => price;
}

// base overhead in seconds (queue + model init) + per-clip-second cost.
// Resolution multiplies the per-second cost (bigger frames = slower).
function typicalSecondsOf(base: number, perClipSec: number, resMult: Record<string, number> = {}) {
  return (duration: number | null | undefined, resolution: string | null | undefined) => {
    const d = duration ?? 5;
    const mult = resolution ? resMult[resolution] ?? 1 : 1;
    return Math.round(base + perClipSec * d * mult);
  };
}

// ─── ByteDance Seedance ────────────────────────────────────────────────

const seedance1Pro: VideoModel = {
  id: 'seedance-1-pro',
  label: 'Seedance 1.0 Pro',
  family: 'ByteDance Seedance',
  endpoint: 'fal-ai/bytedance/seedance/v1/pro/image-to-video',
  description:
    'ByteDance flagship v1 — high fidelity motion and detail.',
  durations: [5, 10],
  resolutions: ['480p', '720p', '1080p'],
  aspects: ['auto', '16:9', '9:16', '1:1'],
  buildPayload: ({ imageUrl, prompt, duration, resolution, aspect, seed }) => ({
    image_url: imageUrl,
    prompt: prompt || '',
    duration,
    ...(resolution ? { resolution } : {}),
    ...(aspect ? { aspect_ratio: aspect } : {}),
    ...(typeof seed === 'number' ? { seed } : {}),
  }),
  estimateCostUSD: perSecondTable({ '480p': 0.062, '720p': 0.124, '1080p': 0.248 }),
  typicalSeconds: typicalSecondsOf(25, 8, { '480p': 0.7, '720p': 1, '1080p': 1.6 }),
};

const seedance1Lite: VideoModel = {
  id: 'seedance-1-lite',
  label: 'Seedance 1.0 Lite',
  family: 'ByteDance Seedance',
  endpoint: 'fal-ai/bytedance/seedance/v1/lite/image-to-video',
  description:
    'Lighter v1 variant — faster and cheaper, good for iterating on prompts.',
  durations: [5, 10],
  resolutions: ['480p', '720p', '1080p'],
  aspects: ['auto', '16:9', '9:16', '1:1'],
  buildPayload: seedance1Pro.buildPayload,
  estimateCostUSD: perSecondTable({ '480p': 0.018, '720p': 0.036, '1080p': 0.072 }),
  typicalSeconds: typicalSecondsOf(15, 4, { '480p': 0.7, '720p': 1, '1080p': 1.6 }),
};

// Seedance 2.0 — matches v1's URL pattern (bytedance/seedance/v{N}/{tier}).
// Both Pro and Lite share v1's payload shape; the status/result route now
// tolerates multiple fal response shapes (video.url, video_url, videos[0],
// and output-nested variants) so 2.0 completions are extracted correctly.
const seedance2Pro: VideoModel = {
  id: 'seedance-2-pro',
  label: 'Seedance 2.0 Pro',
  family: 'ByteDance Seedance',
  endpoint: 'fal-ai/bytedance/seedance/v2/pro/image-to-video',
  description:
    'Latest ByteDance Seedance — best motion coherence and prompt adherence.',
  durations: [5, 10],
  resolutions: ['480p', '720p', '1080p'],
  aspects: ['auto', '16:9', '9:16', '1:1'],
  buildPayload: seedance1Pro.buildPayload,
  estimateCostUSD: perSecondTable({ '480p': 0.08, '720p': 0.16, '1080p': 0.32 }),
  typicalSeconds: typicalSecondsOf(30, 10, { '480p': 0.7, '720p': 1, '1080p': 1.6 }),
};

const seedance2Lite: VideoModel = {
  id: 'seedance-2-lite',
  label: 'Seedance 2.0 Lite',
  family: 'ByteDance Seedance',
  endpoint: 'fal-ai/bytedance/seedance/v2/lite/image-to-video',
  description:
    'Lighter v2 variant — faster and cheaper, good for iterating on prompts.',
  durations: [5, 10],
  resolutions: ['480p', '720p', '1080p'],
  aspects: ['auto', '16:9', '9:16', '1:1'],
  buildPayload: seedance1Pro.buildPayload,
  estimateCostUSD: perSecondTable({ '480p': 0.024, '720p': 0.048, '1080p': 0.096 }),
  typicalSeconds: typicalSecondsOf(20, 5, { '480p': 0.7, '720p': 1, '1080p': 1.6 }),
};

// ─── Kuaishou Kling ────────────────────────────────────────────────────

// Kling takes duration as a string ("5"/"10") and ignores resolution —
// each tier of the model has a fixed output resolution.
const klingBuildPayload = ({ imageUrl, prompt, duration, aspect }: VideoPayloadParams) => ({
  image_url: imageUrl,
  prompt: prompt || '',
  duration: String(duration),
  ...(aspect ? { aspect_ratio: aspect } : {}),
});

const kling21Master: VideoModel = {
  id: 'kling-2-1-master',
  label: 'Kling 2.1 Master',
  family: 'Kuaishou Kling',
  endpoint: 'fal-ai/kling-video/v2.1/master/image-to-video',
  description:
    'Kling v2.1 Master tier — cinematic motion, strong stylization. Premium.',
  durations: [5, 10],
  resolutions: [],
  aspects: ['16:9', '9:16', '1:1'],
  buildPayload: klingBuildPayload,
  estimateCostUSD: perSecondFlat(0.28),
  typicalSeconds: typicalSecondsOf(60, 18),
};

const kling21Pro: VideoModel = {
  id: 'kling-2-1-pro',
  label: 'Kling 2.1 Pro',
  family: 'Kuaishou Kling',
  endpoint: 'fal-ai/kling-video/v2.1/pro/image-to-video',
  description:
    'Kling v2.1 Pro tier — balanced quality and speed.',
  durations: [5, 10],
  resolutions: [],
  aspects: ['16:9', '9:16', '1:1'],
  buildPayload: klingBuildPayload,
  estimateCostUSD: perSecondFlat(0.19),
  typicalSeconds: typicalSecondsOf(45, 14),
};

const kling21Std: VideoModel = {
  id: 'kling-2-1-standard',
  label: 'Kling 2.1 Standard',
  family: 'Kuaishou Kling',
  endpoint: 'fal-ai/kling-video/v2.1/standard/image-to-video',
  description:
    'Kling v2.1 Standard tier — cheapest Kling, good for quick iterations.',
  durations: [5, 10],
  resolutions: [],
  aspects: ['16:9', '9:16', '1:1'],
  buildPayload: klingBuildPayload,
  estimateCostUSD: perSecondFlat(0.05),
  typicalSeconds: typicalSecondsOf(30, 9),
};

const kling16Pro: VideoModel = {
  id: 'kling-1-6-pro',
  label: 'Kling 1.6 Pro',
  family: 'Kuaishou Kling',
  endpoint: 'fal-ai/kling-video/v1.6/pro/image-to-video',
  description: 'Previous Kling generation — v1.6 Pro.',
  durations: [5, 10],
  resolutions: [],
  aspects: ['16:9', '9:16', '1:1'],
  buildPayload: klingBuildPayload,
  estimateCostUSD: perSecondFlat(0.095),
  typicalSeconds: typicalSecondsOf(40, 11),
};

// ─── Luma Ray ──────────────────────────────────────────────────────────

// Luma Ray takes duration as "5s" / "9s" (strings with suffix) and
// supports a richer set of aspect ratios.
const lumaBuildPayload = ({ imageUrl, prompt, duration, resolution, aspect }: VideoPayloadParams) => ({
  image_url: imageUrl,
  prompt: prompt || '',
  duration: `${duration}s`,
  ...(resolution ? { resolution } : {}),
  ...(aspect ? { aspect_ratio: aspect } : {}),
});

const lumaRay2: VideoModel = {
  id: 'luma-ray-2',
  label: 'Luma Ray 2',
  family: 'Luma Dream Machine',
  endpoint: 'fal-ai/luma-dream-machine/ray-2/image-to-video',
  description:
    'Luma Ray 2 — smooth realistic motion, strong at natural scenes.',
  durations: [5, 9],
  resolutions: ['540p', '720p', '1080p'],
  aspects: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', '9:21'],
  buildPayload: lumaBuildPayload,
  estimateCostUSD: perSecondTable({ '540p': 0.08, '720p': 0.144, '1080p': 0.28 }),
  typicalSeconds: typicalSecondsOf(30, 10, { '540p': 0.7, '720p': 1, '1080p': 1.6 }),
};

const lumaRay2Flash: VideoModel = {
  id: 'luma-ray-2-flash',
  label: 'Luma Ray 2 Flash',
  family: 'Luma Dream Machine',
  endpoint: 'fal-ai/luma-dream-machine/ray-2-flash/image-to-video',
  description: 'Faster, cheaper Ray 2 — good for iteration.',
  durations: [5, 9],
  resolutions: ['540p', '720p', '1080p'],
  aspects: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', '9:21'],
  buildPayload: lumaBuildPayload,
  estimateCostUSD: perSecondTable({ '540p': 0.03, '720p': 0.048, '1080p': 0.1 }),
  typicalSeconds: typicalSecondsOf(18, 6, { '540p': 0.7, '720p': 1, '1080p': 1.6 }),
};

// ─── MiniMax Hailuo 02 ─────────────────────────────────────────────────

// Hailuo takes duration as a number and resolution as upper-case "768P".
// We lower-case our UI values and upper-case them here.
const hailuoBuildPayload = ({ imageUrl, prompt, duration, resolution }: VideoPayloadParams) => ({
  image_url: imageUrl,
  prompt: prompt || '',
  duration,
  ...(resolution ? { resolution: resolution.toUpperCase() } : {}),
  prompt_optimizer: true,
});

const hailuo02Pro: VideoModel = {
  id: 'hailuo-02-pro',
  label: 'Hailuo 02 Pro',
  family: 'MiniMax Hailuo',
  endpoint: 'fal-ai/minimax/hailuo-02/pro/image-to-video',
  description:
    'MiniMax Hailuo 02 Pro — precise prompt following, strong realism.',
  durations: [6, 10],
  resolutions: ['768p', '1080p'],
  aspects: [],
  buildPayload: hailuoBuildPayload,
  estimateCostUSD: perSecondTable({ '768p': 0.08, '1080p': 0.12 }),
  typicalSeconds: typicalSecondsOf(40, 10, { '768p': 1, '1080p': 1.5 }),
};

const hailuo02Std: VideoModel = {
  id: 'hailuo-02-standard',
  label: 'Hailuo 02 Standard',
  family: 'MiniMax Hailuo',
  endpoint: 'fal-ai/minimax/hailuo-02/standard/image-to-video',
  description: 'Cheaper Hailuo 02 — good baseline for animated stills.',
  durations: [6, 10],
  resolutions: ['512p', '768p'],
  aspects: [],
  buildPayload: hailuoBuildPayload,
  estimateCostUSD: perSecondTable({ '512p': 0.02, '768p': 0.045 }),
  typicalSeconds: typicalSecondsOf(25, 6, { '512p': 0.8, '768p': 1 }),
};

// ─── Alibaba Wan ───────────────────────────────────────────────────────

const wan22: VideoModel = {
  id: 'wan-2-2-a14b',
  label: 'Wan 2.2 (A14B)',
  family: 'Alibaba Wan',
  endpoint: 'fal-ai/wan/v2.2-a14b/image-to-video',
  description: 'Alibaba Wan 2.2 A14B i2v — strong subject consistency.',
  durations: [5],
  resolutions: ['480p', '720p'],
  aspects: ['16:9', '9:16', '1:1'],
  buildPayload: ({ imageUrl, prompt, duration, resolution, aspect }) => ({
    image_url: imageUrl,
    prompt: prompt || '',
    num_frames: duration * 24,
    ...(resolution ? { resolution } : {}),
    ...(aspect ? { aspect_ratio: aspect } : {}),
  }),
  estimateCostUSD: perSecondTable({ '480p': 0.04, '720p': 0.08 }),
  typicalSeconds: typicalSecondsOf(50, 14, { '480p': 0.8, '720p': 1 }),
};

// ─── Google Veo 3 ──────────────────────────────────────────────────────

const veo3: VideoModel = {
  id: 'veo-3',
  label: 'Veo 3 (Google)',
  family: 'Google Veo',
  endpoint: 'fal-ai/veo3/image-to-video',
  description:
    'Google Veo 3 — premium quality, with native audio. Most expensive.',
  durations: [8],
  resolutions: [],
  aspects: ['16:9', '9:16'],
  buildPayload: ({ imageUrl, prompt, aspect }) => ({
    image_url: imageUrl,
    prompt: prompt || '',
    ...(aspect ? { aspect_ratio: aspect } : {}),
  }),
  estimateCostUSD: flatPerGeneration(6.0),
  typicalSeconds: typicalSecondsOf(180, 15),
};

// ─── Exported catalog ──────────────────────────────────────────────────

// Exported catalog. Seedance 2.0 sits at the top as the default tier
// since it's the newest ByteDance generation.
export const VIDEO_MODELS: VideoModel[] = [
  seedance2Pro,
  seedance2Lite,
  seedance1Pro,
  seedance1Lite,
  kling21Master,
  kling21Pro,
  kling21Std,
  kling16Pro,
  lumaRay2,
  lumaRay2Flash,
  hailuo02Pro,
  hailuo02Std,
  wan22,
  veo3,
];

export const DEFAULT_VIDEO_MODEL_ID = seedance2Pro.id;

export function findVideoModel(id: string | null | undefined): VideoModel | null {
  if (!id) return null;
  return VIDEO_MODELS.find((m) => m.id === id) || null;
}

export function findVideoModelByEndpoint(endpoint: string | null | undefined): VideoModel | null {
  if (!endpoint) return null;
  return VIDEO_MODELS.find((m) => m.endpoint === endpoint) || null;
}

export function estimateVideoCostUSD(
  model: VideoModel,
  durationSeconds: number | null | undefined,
  resolution: string | null | undefined,
): number | null {
  return model.estimateCostUSD(durationSeconds, resolution);
}

// Model families in first-seen order, for optgroup-style UI dropdowns.
export function videoModelFamilies(): { family: string; models: VideoModel[] }[] {
  const order: string[] = [];
  const byFamily: Record<string, VideoModel[]> = {};
  for (const m of VIDEO_MODELS) {
    if (!byFamily[m.family]) {
      order.push(m.family);
      byFamily[m.family] = [];
    }
    byFamily[m.family].push(m);
  }
  return order.map((family) => ({ family, models: byFamily[family] }));
}
