// Per-platform deliverable specs for the Social Media composer.
//
// Each entry is the source of truth for what a platform accepts,
// surfaced to the admin both visually (the SpecCard panel) and
// programmatically (console-logged when they pick a platform). When
// Ayrshare or a platform changes a limit, edit it here once.
//
// All sizes are pixel dimensions. Aspect ratios are written w:h.
// Caption / title / description char counts are upper bounds — most
// platforms truncate gracefully but several reject hard at the cap.

import type { PlatformId } from './PlatformIcon';

export interface MediaSpec {
  /** Human-readable label, e.g. "Feed (1:1)" or "Reel (9:16)". */
  label: string;
  /** w:h string, e.g. "1:1" or "9:16". */
  ratio: string;
  /** Recommended pixel dimensions. */
  size?: string;
  /** Upper bound on file size, when the platform enforces one. */
  maxFileSize?: string;
  /** Notes — codec hints, frame rate caps, etc. */
  notes?: string;
}

export interface VideoSpec extends MediaSpec {
  /** Minimum video length in seconds. */
  minSeconds?: number;
  /** Maximum video length in seconds. */
  maxSeconds?: number;
}

export interface CtaOption {
  /** API value Ayrshare expects, when applicable. */
  value: string;
  /** Human-facing label. */
  label: string;
}

export interface PlatformSpec {
  id: PlatformId;
  /** What the platform calls the body of a post. */
  textLabel: string;
  /** Maximum characters in the caption / status / message field. */
  textMax: number;
  /** When the platform publishes a sweet-spot length. */
  textRecommended?: string;
  /** Some platforms (YouTube, Pinterest, Reddit) have a separate title. */
  hasSeparateTitle?: boolean;
  titleMax?: number;
  /** Description char cap when separate from caption (YouTube, Pinterest). */
  descriptionMax?: number;
  /** Hashtag rules — sweet spot count and the platform's hard cap. */
  hashtagRecommended?: number;
  hashtagMax?: number;
  /** Whether links inside the caption are clickable. */
  linksClickable: boolean;
  /** Image specs the platform accepts. */
  images: MediaSpec[];
  /** Video specs the platform accepts. */
  videos: VideoSpec[];
  /** Max number of media items per post (carousel cap). */
  mediaCountMax?: number;
  /** Whether the platform requires media (TikTok / YouTube / Pinterest). */
  mediaRequired?: boolean;
  /** CTA button options, when the platform supports them. */
  ctas?: CtaOption[];
  /** Free-form deliverable tips that don't fit the structured fields. */
  notes: string[];
  /** Link to Ayrshare's per-platform docs for this network. */
  ayrshareDocs?: string;
}

export const PLATFORM_SPECS: Record<PlatformId, PlatformSpec> = {
  facebook: {
    id: 'facebook',
    textLabel: 'Caption',
    textMax: 63206,
    textRecommended: '40–80 chars perform best on the feed',
    linksClickable: true,
    mediaCountMax: 10,
    images: [
      { label: 'Feed (1:1)', ratio: '1:1', size: '1080×1080' },
      { label: 'Feed portrait (4:5)', ratio: '4:5', size: '1080×1350' },
      { label: 'Link preview (1.91:1)', ratio: '1.91:1', size: '1200×630' },
      { label: 'Story (9:16)', ratio: '9:16', size: '1080×1920' },
    ],
    videos: [
      { label: 'Feed video', ratio: '16:9 / 1:1 / 4:5', size: '≥1280px wide', minSeconds: 1, maxSeconds: 240, notes: 'MP4 / MOV, H.264 + AAC' },
      { label: 'Reels (9:16)', ratio: '9:16', size: '1080×1920', minSeconds: 3, maxSeconds: 90 },
      { label: 'Story (9:16)', ratio: '9:16', size: '1080×1920', minSeconds: 1, maxSeconds: 60 },
    ],
    ctas: [
      { value: 'LEARN_MORE', label: 'Learn More' },
      { value: 'SHOP_NOW', label: 'Shop Now' },
      { value: 'BOOK_NOW', label: 'Book Now' },
      { value: 'CONTACT_US', label: 'Contact Us' },
      { value: 'SIGN_UP', label: 'Sign Up' },
    ],
    notes: [
      'Carousel posts can hold up to 10 images / videos.',
      'Hashtags don\'t boost reach the way they used to — use sparingly.',
      'Link previews unfurl automatically when a URL is in the caption.',
    ],
    ayrshareDocs: 'https://docs.ayrshare.com/social-networks/facebook',
  },

  instagram: {
    id: 'instagram',
    textLabel: 'Caption',
    textMax: 2200,
    textRecommended: 'First 125 chars show before "more" — front-load the hook',
    hashtagRecommended: 5,
    hashtagMax: 30,
    linksClickable: false,
    mediaCountMax: 10,
    mediaRequired: true,
    images: [
      { label: 'Feed (1:1)', ratio: '1:1', size: '1080×1080' },
      { label: 'Feed portrait (4:5)', ratio: '4:5', size: '1080×1350' },
      { label: 'Story / Reel (9:16)', ratio: '9:16', size: '1080×1920' },
    ],
    videos: [
      { label: 'Reels (9:16)', ratio: '9:16', size: '1080×1920', minSeconds: 3, maxSeconds: 90, notes: 'Up to 15 minutes for some accounts' },
      { label: 'Feed video', ratio: '1:1 or 4:5', size: '1080×1080', minSeconds: 3, maxSeconds: 60 },
      { label: 'Story (9:16)', ratio: '9:16', size: '1080×1920', minSeconds: 1, maxSeconds: 60 },
    ],
    notes: [
      'URLs in the caption are NOT clickable — drive traffic via "link in bio".',
      'Reels post type performs best for reach right now.',
      'Alt text is per-image; set it for every carousel slide.',
      'Tagged users + a location boost discoverability on Reels.',
    ],
    ayrshareDocs: 'https://docs.ayrshare.com/social-networks/instagram',
  },

  linkedin: {
    id: 'linkedin',
    textLabel: 'Post text',
    textMax: 3000,
    textRecommended: 'First 210 chars show before "see more" — open with the hook',
    hashtagRecommended: 3,
    hashtagMax: 30,
    linksClickable: true,
    mediaCountMax: 9,
    images: [
      { label: 'Single image (1.91:1)', ratio: '1.91:1', size: '1200×627' },
      { label: 'Square (1:1)', ratio: '1:1', size: '1200×1200' },
      { label: 'Document share (PDF)', ratio: 'A4 / Letter', notes: 'Up to 300 pages, ~100MB' },
    ],
    videos: [
      { label: 'Feed video', ratio: '16:9 / 1:1', minSeconds: 3, maxSeconds: 600, notes: 'Up to 10 min, ~5GB' },
    ],
    ctas: [
      { value: 'LEARN_MORE', label: 'Learn More' },
      { value: 'APPLY_NOW', label: 'Apply Now' },
      { value: 'DOWNLOAD', label: 'Download' },
      { value: 'GET_QUOTE', label: 'Get Quote' },
      { value: 'SIGN_UP', label: 'Sign Up' },
      { value: 'SUBSCRIBE', label: 'Subscribe' },
      { value: 'REGISTER', label: 'Register' },
    ],
    notes: [
      'Long-form text posts (1500–3000 chars) outperform short ones.',
      'Document carousels (PDFs) drive 2-3× the dwell time of image posts.',
      '3–5 hashtags is the sweet spot; more dilutes the algorithm signal.',
    ],
    ayrshareDocs: 'https://docs.ayrshare.com/social-networks/linkedin',
  },

  twitter: {
    id: 'twitter',
    textLabel: 'Tweet',
    textMax: 280,
    textRecommended: 'Premium / X Pro accounts can post up to 25,000 chars',
    hashtagRecommended: 2,
    linksClickable: true,
    mediaCountMax: 4,
    images: [
      { label: 'Single image', ratio: '16:9 / 1:1', size: '1200×675' },
      { label: 'Portrait', ratio: '5:8', size: '1200×1920' },
    ],
    videos: [
      { label: 'Standard video', ratio: '16:9 or 1:1', minSeconds: 1, maxSeconds: 140, notes: 'Free tier; Premium goes to 10 min' },
    ],
    notes: [
      'Threads = consecutive replies; Ayrshare supports them via threadTexts[].',
      'Reply settings let you scope who can reply (everyone / mentioned / following).',
      'Polls are supported — up to 4 options, 5min–7day duration.',
      'Keep hashtags to 1–2; more reads as spam.',
    ],
    ayrshareDocs: 'https://docs.ayrshare.com/social-networks/twitter',
  },

  tiktok: {
    id: 'tiktok',
    textLabel: 'Caption',
    textMax: 4000,
    hashtagRecommended: 5,
    hashtagMax: 100,
    linksClickable: false,
    mediaCountMax: 1,
    mediaRequired: true,
    images: [],
    videos: [
      { label: 'Vertical video', ratio: '9:16', size: '1080×1920', minSeconds: 1, maxSeconds: 600, notes: 'MP4 / MOV, H.264, ≤287MB' },
    ],
    notes: [
      'Vertical 9:16 only. Horizontal video gets letter-boxed and tanks reach.',
      'Trending sounds matter more than the caption — Ayrshare lets you set audioName.',
      'You can disable comments / duet / stitch per post.',
      'Cover frame defaults to 0s; offset via thumbnailOffset (in milliseconds).',
    ],
    ayrshareDocs: 'https://docs.ayrshare.com/social-networks/tiktok',
  },

  youtube: {
    id: 'youtube',
    textLabel: 'Description',
    textMax: 5000,
    hasSeparateTitle: true,
    titleMax: 100,
    hashtagRecommended: 3,
    hashtagMax: 15,
    linksClickable: true,
    mediaCountMax: 1,
    mediaRequired: true,
    images: [
      { label: 'Thumbnail', ratio: '16:9', size: '1280×720', notes: 'JPG / PNG, ≤2MB' },
    ],
    videos: [
      { label: 'Long-form (16:9)', ratio: '16:9', size: '1920×1080+', minSeconds: 1, maxSeconds: 43200, notes: 'Up to 12hr, 256GB' },
      { label: 'Short (9:16)', ratio: '9:16', size: '1080×1920', minSeconds: 1, maxSeconds: 60 },
    ],
    notes: [
      'Title + thumbnail drive 90% of click-through. Spend the time there.',
      'First 100 chars of description appear above "show more" — front-load keywords.',
      'Shorts (≤60s, 9:16) are auto-detected and surfaced in the Shorts feed.',
      'Visibility: public / unlisted / private. "Made for kids" is a separate flag.',
    ],
    ayrshareDocs: 'https://docs.ayrshare.com/social-networks/youtube',
  },

  pinterest: {
    id: 'pinterest',
    textLabel: 'Description',
    textMax: 800,
    hasSeparateTitle: true,
    titleMax: 100,
    descriptionMax: 800,
    linksClickable: true,
    mediaCountMax: 1,
    mediaRequired: true,
    images: [
      { label: 'Standard pin (2:3)', ratio: '2:3', size: '1000×1500' },
      { label: 'Square pin (1:1)', ratio: '1:1', size: '1000×1000' },
    ],
    videos: [
      { label: 'Video pin', ratio: '2:3 or 1:1', minSeconds: 4, maxSeconds: 900, notes: 'MP4 / MOV / M4V, ≤2GB' },
    ],
    notes: [
      '2:3 vertical pins outperform every other ratio. Don\'t use 1.91:1 here.',
      'Every pin needs a destination URL — that\'s how Pinterest measures conversion.',
      'You can pin to a specific board (boardId) or default to the profile.',
    ],
    ayrshareDocs: 'https://docs.ayrshare.com/social-networks/pinterest',
  },

  gmb: {
    id: 'gmb',
    textLabel: 'Post body',
    textMax: 1500,
    linksClickable: true,
    mediaCountMax: 1,
    images: [
      { label: 'Photo (4:3)', ratio: '4:3', size: '1200×900' },
    ],
    videos: [
      { label: 'Standard video', ratio: '16:9 or 4:3', maxSeconds: 30, notes: '≤100MB' },
    ],
    ctas: [
      { value: 'BOOK', label: 'Book' },
      { value: 'ORDER', label: 'Order online' },
      { value: 'SHOP', label: 'Shop' },
      { value: 'LEARN_MORE', label: 'Learn more' },
      { value: 'SIGN_UP', label: 'Sign up' },
      { value: 'CALL', label: 'Call now' },
    ],
    notes: [
      'Posts auto-expire 7 days after publish — schedule a refresh cadence.',
      'Use postType=EVENT or OFFER to extend visibility past the 7-day default.',
      'CTA URL is required when a CTA button is set.',
    ],
    ayrshareDocs: 'https://docs.ayrshare.com/social-networks/google-business',
  },

  reddit: {
    id: 'reddit',
    textLabel: 'Body (self-text)',
    textMax: 40000,
    hasSeparateTitle: true,
    titleMax: 300,
    linksClickable: true,
    mediaCountMax: 20,
    images: [
      { label: 'Image post', ratio: 'any', notes: 'JPG / PNG / GIF, ≤20MB' },
    ],
    videos: [
      { label: 'Video post', ratio: 'any', maxSeconds: 900, notes: '≤1GB' },
    ],
    notes: [
      'Subreddit is required. Each subreddit has its own rules — read them first.',
      'Self-promotion ratio rule: keep promotional posts below 10% of activity.',
      'Flair, NSFW, and Spoiler tags are per-post; some subs require flair.',
      'Most subs have a karma / age requirement before posts publish.',
    ],
    ayrshareDocs: 'https://docs.ayrshare.com/social-networks/reddit',
  },

  threads: {
    id: 'threads',
    textLabel: 'Post text',
    textMax: 500,
    linksClickable: true,
    mediaCountMax: 10,
    images: [
      { label: 'Inline image (1:1 / 4:5 / 1.91:1)', ratio: '1:1, 4:5, 1.91:1', size: 'matches Instagram' },
    ],
    videos: [
      { label: 'Inline video', ratio: '9:16 or 1:1', maxSeconds: 300, notes: 'Up to 5 min' },
    ],
    notes: [
      'Reply control: everyone, accounts you follow, or mentioned-only.',
      'Hashtags appear but get less algorithmic boost than on Instagram.',
      'Cross-posts to the Threads-from-Instagram audience automatically.',
    ],
    ayrshareDocs: 'https://docs.ayrshare.com/social-networks/threads',
  },

  bluesky: {
    id: 'bluesky',
    textLabel: 'Post text',
    textMax: 300,
    linksClickable: true,
    mediaCountMax: 4,
    images: [
      { label: 'Inline image', ratio: 'any', size: '≤1000×1000', notes: 'JPG / PNG, ≤1MB each' },
    ],
    videos: [
      { label: 'Inline video', ratio: 'any', maxSeconds: 60, notes: 'MP4, ≤50MB' },
    ],
    notes: [
      'Federated via the AT Protocol; the post appears across compatible clients.',
      'Feeds are mostly chronological — engagement timing matters less than on IG / X.',
      'Hashtags work but discoverability is lower than on incumbent networks.',
    ],
    ayrshareDocs: 'https://docs.ayrshare.com/social-networks/bluesky',
  },
};
