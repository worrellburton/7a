import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { OUTINGS } from '@/lib/outings';
import { OUTING_PHOTO_SOURCES, type OutingPhotoSource } from '@/lib/outings-photo-sources';

// POST /api/outings/load-photos
//
// Admin-only. For each outing in the photo-source manifest, looks up
// the lead image of the configured Wikipedia article via the REST
// summary API, fetches the actual file's license + artist via the
// Commons API where possible, downloads the image bytes, uploads to
// public-images/outings/<slug>.<ext>, and upserts a row into
// public.outings_images with the attribution metadata.
//
// Body: { force?: boolean } — when true, refetch even if there's
// already a real-photo row (a row with source_url is real-photo).
//
// Returns per-entry status so the admin sees which lookups failed.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BUCKET = 'public-images';
const UA = 'SevenArrowsRecoveryBot/1.0 (https://sevenarrowsrecoveryarizona.com; admin@sevenarrowsrecoveryarizona.com)';

interface LoadResultItem {
  slug: string;
  status: 'loaded' | 'skipped' | 'error';
  imageUrl?: string;
  credit?: string;
  license?: string;
  sourceUrl?: string;
  error?: string;
}

interface WikipediaSummary {
  title?: string;
  description?: string;
  originalimage?: { source?: string; width?: number; height?: number };
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

interface CommonsExtMetadataField {
  value?: string | number;
}
interface CommonsImageInfo {
  url?: string;
  user?: string;
  extmetadata?: {
    Artist?: CommonsExtMetadataField;
    Credit?: CommonsExtMetadataField;
    LicenseShortName?: CommonsExtMetadataField;
    LicenseUrl?: CommonsExtMetadataField;
    UsageTerms?: CommonsExtMetadataField;
    AttributionRequired?: CommonsExtMetadataField;
    DescriptionShortUrl?: CommonsExtMetadataField;
  };
}
interface CommonsApiResponse {
  query?: { pages?: Record<string, { imageinfo?: CommonsImageInfo[] }> };
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { force?: boolean };
  const force = !!body.force;

  const admin = getAdminSupabase();
  const results: LoadResultItem[] = [];

  for (const source of OUTING_PHOTO_SOURCES) {
    try {
      const result = await loadOne(admin, source, force);
      results.push(result);
    } catch (err) {
      results.push({
        slug: source.outingSlug,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const loaded = results.filter((r) => r.status === 'loaded').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errors = results.filter((r) => r.status === 'error').length;
  return NextResponse.json({ total: results.length, loaded, skipped, errors, results });
}

async function loadOne(
  admin: ReturnType<typeof getAdminSupabase>,
  source: OutingPhotoSource,
  force: boolean,
): Promise<LoadResultItem> {
  const outing = OUTINGS.find((o) => o.slug === source.outingSlug);
  if (!outing) {
    return { slug: source.outingSlug, status: 'error', error: 'Unknown outing slug' };
  }

  // Skip if a real-photo row (source_url populated) already exists
  // and we're not forcing. AI-gen rows have a populated source_prompt
  // and null source_url; those should be replaced.
  if (!force) {
    const { data: existing } = await admin
      .from('outings_images')
      .select('source_url')
      .eq('slug', source.outingSlug)
      .maybeSingle();
    if (existing?.source_url) {
      return { slug: source.outingSlug, status: 'skipped' };
    }
  }

  // 1. Wikipedia summary -> lead image URL.
  const summaryRes = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(source.wikipediaSlug)}`,
    { headers: { 'user-agent': UA, accept: 'application/json' }, cache: 'no-store' },
  );
  if (!summaryRes.ok) {
    return {
      slug: source.outingSlug,
      status: 'error',
      error: `Wikipedia summary HTTP ${summaryRes.status}`,
    };
  }
  const summary = (await summaryRes.json()) as WikipediaSummary;
  const leadUrl = summary.originalimage?.source ?? summary.thumbnail?.source;
  if (!leadUrl) {
    return {
      slug: source.outingSlug,
      status: 'error',
      error: 'No lead image found on Wikipedia article',
    };
  }
  const sourcePageUrl = summary.content_urls?.desktop?.page
    ?? `https://en.wikipedia.org/wiki/${source.wikipediaSlug}`;

  // 2. Commons API -> license + artist for the actual file. The
  //    summary URL points to upload.wikimedia.org/wikipedia/commons/
  //    or /wikipedia/en/; only commons-hosted files have license
  //    metadata via the Commons API, so we fall back to the manifest
  //    defaults if the lookup misses.
  const fileTitle = extractCommonsFileTitle(leadUrl);
  let credit = source.fallbackCredit;
  let license = source.fallbackLicense;
  let licenseUrl = source.fallbackLicenseUrl;
  if (fileTitle) {
    const meta = await fetchCommonsMetadata(fileTitle);
    if (meta) {
      if (meta.artist) credit = meta.artist;
      if (meta.license) license = meta.license;
      if (meta.licenseUrl) licenseUrl = meta.licenseUrl;
    }
  }

  // 3. Download the image bytes.
  const imgRes = await fetch(leadUrl, {
    headers: { 'user-agent': UA },
    cache: 'no-store',
  });
  if (!imgRes.ok) {
    return {
      slug: source.outingSlug,
      status: 'error',
      error: `Image fetch HTTP ${imgRes.status}`,
    };
  }
  const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
  const ext = contentTypeToExt(contentType, leadUrl);
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  // 4. Upload to Supabase storage. We re-use the same path on every
  //    refresh (upsert: true) so the public URL stays stable across
  //    reloads — bookmarks + Open Graph caches don't break.
  const path = `outings/${source.outingSlug}.${ext}`;
  const upload = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
    cacheControl: '604800',
  });
  if (upload.error) {
    return {
      slug: source.outingSlug,
      status: 'error',
      error: `Storage upload: ${upload.error.message}`,
    };
  }
  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) {
    return { slug: source.outingSlug, status: 'error', error: 'No public URL for upload' };
  }

  // 5. Upsert the row.
  const { error: upsertError } = await admin
    .from('outings_images')
    .upsert(
      {
        slug: source.outingSlug,
        image_url: publicUrl,
        source_prompt: null,
        model: 'wikipedia-lead-image',
        generated_at: new Date().toISOString(),
        credit,
        license,
        license_url: licenseUrl,
        source_url: sourcePageUrl,
      },
      { onConflict: 'slug' },
    );
  if (upsertError) {
    return {
      slug: source.outingSlug,
      status: 'error',
      error: `DB upsert: ${upsertError.message}`,
    };
  }

  return {
    slug: source.outingSlug,
    status: 'loaded',
    imageUrl: publicUrl,
    credit,
    license,
    sourceUrl: sourcePageUrl,
  };
}

// Wikimedia file URLs look like:
//   https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/File.jpg/640px-File.jpg
//   https://upload.wikimedia.org/wikipedia/commons/a/ab/File.jpg
// We need just "File.jpg" so we can hit the Commons API.
function extractCommonsFileTitle(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('wikimedia.org')) return null;
    if (!u.pathname.includes('/wikipedia/commons/')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    // For thumb URLs the last segment is "640px-File.jpg" but the
    // segment two before that is "File.jpg"; for non-thumb URLs the
    // last segment is "File.jpg" directly.
    if (parts.includes('thumb')) {
      // .../thumb/a/ab/File.jpg/640px-File.jpg -> File.jpg
      const thumbIdx = parts.indexOf('thumb');
      return decodeURIComponent(parts[thumbIdx + 3] ?? '') || null;
    }
    return decodeURIComponent(parts[parts.length - 1] ?? '') || null;
  } catch {
    return null;
  }
}

async function fetchCommonsMetadata(fileTitle: string): Promise<{
  artist: string | null;
  license: string | null;
  licenseUrl: string | null;
} | null> {
  const params = new URLSearchParams({
    action: 'query',
    titles: `File:${fileTitle}`,
    prop: 'imageinfo',
    iiprop: 'url|user|extmetadata',
    format: 'json',
    formatversion: '2',
  });
  const url = `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = (await res.json()) as CommonsApiResponse;
  // formatversion=2 returns pages as an array; some installs still
  // return an object keyed by pageid. Handle both.
  const pages = json.query?.pages;
  let info: CommonsImageInfo | undefined;
  if (Array.isArray(pages)) {
    info = (pages as Array<{ imageinfo?: CommonsImageInfo[] }>)[0]?.imageinfo?.[0];
  } else if (pages && typeof pages === 'object') {
    const first = Object.values(pages)[0];
    info = first?.imageinfo?.[0];
  }
  if (!info) return null;
  const m = info.extmetadata;
  // Artist values often contain HTML (links). Strip tags so the
  // overlay doesn't render markup.
  const stripHtml = (s?: string | number | null) =>
    typeof s === 'string'
      ? s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || null
      : null;
  return {
    artist: stripHtml(m?.Artist?.value) ?? stripHtml(m?.Credit?.value) ?? info.user ?? null,
    license: stripHtml(m?.LicenseShortName?.value) ?? stripHtml(m?.UsageTerms?.value) ?? null,
    licenseUrl: stripHtml(m?.LicenseUrl?.value) ?? null,
  };
}

function contentTypeToExt(contentType: string, url: string): string {
  const lc = contentType.toLowerCase();
  if (lc.includes('jpeg') || lc.includes('jpg')) return 'jpg';
  if (lc.includes('png')) return 'png';
  if (lc.includes('webp')) return 'webp';
  if (lc.includes('gif')) return 'gif';
  // Fall back to URL extension if Content-Type is generic.
  const m = url.match(/\.([a-z0-9]{2,5})(?:[?#]|$)/i);
  return m ? m[1].toLowerCase() : 'jpg';
}
