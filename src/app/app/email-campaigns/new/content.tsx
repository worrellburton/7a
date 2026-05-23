'use client';

// Phase 3 + 4 + 5 — the New Campaign builder.
//
// Modeled on /app/social-media/create: the marketer types a
// paragraph describing what they want the email to say, picks
// images from the library, flips two toggles ("use logos" — drop
// the Seven Arrows mark into the header — and "link to website"
// — add a primary CTA back to sevenarrowsrecoveryarizona.com),
// then optionally features a blog post (selectable card list) and
// an employee (clickable team card). Hitting Build calls Claude
// via /api/email-campaigns/build which returns rendered HTML and
// a draft subject line. The marketer can iterate by typing
// follow-up instructions and clicking Iterate, which re-runs the
// build with the previous HTML + the new instructions as context.
//
// Hitting "Save and continue" commits the campaign + html to the
// row and routes to /app/email-campaigns/[id]/recipients.

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { BuildProgress } from '../BuildProgress';
import { SITE_PAGES, SITE_PAGE_GROUPS, findSitePage, type SitePage } from '@/lib/site-pages';
import { Toggle, ModalShell } from '@/components/ui';

interface LibraryImage {
  id: string;
  url: string;
  filename: string | null;
}

// Shared types now live in ./types so the FeaturedX cards can
// import them from a stable location.
import type { BlogOption, EmployeeOption, HorseOption } from './types';
import { FeaturedBlogCard, FeaturedEmployeeCard, FeaturedHorseCard, FeaturedPageCard } from './FeaturedCards';

interface CampaignDraft {
  id?: string;
  prompt: string;
  imageUrls: string[];
  useLogos: boolean;
  linkToWebsite: boolean;
  // Surfaces (866) 718-1665 inside the rendered email when on.
  // Persisted on email_campaigns.include_phone.
  includePhone: boolean;
  // Picks a top Google review and renders it as a block-quote
  // section. Persisted on email_campaigns.include_quote.
  includeQuote: boolean;
  // Renders a small Aetna / BCBS / Cigna / Humana / TRICARE logo
  // strip near the top of the email so coverage is visible at a
  // glance. Persisted on email_campaigns.include_insurance_strip.
  includeInsuranceStrip: boolean;
  // Adds an Instagram / Facebook / LinkedIn icon row to the
  // closing footer. Persisted on email_campaigns.include_social_footer.
  includeSocialFooter: boolean;
  // Flips the email body's palette: light (Sand background, Ink
  // text) ↔ dark (Desert Dusk background, Bone text). Read by
  // Claude at build time as a top-of-prompt directive. Persisted
  // on email_campaigns.dark_mode.
  darkMode: boolean;
  featuredBlogId: string | null;
  // Slug of a static Recovery Roadmap episode when one is featured.
  // Mutually exclusive with featuredBlogId — picking either of them
  // clears the other in setFeaturedBlogChoice() below.
  featuredEpisodeSlug: string | null;
  /** Site-relative path of the featured inner page, e.g. /admissions. */
  featuredPagePath: string | null;
  featuredEmployeeId: string | null;
  featuredEquineId: string | null;
  generatedHtml: string | null;
  generatedSubject: string | null;
}

interface DraftText {
  headline: string;
  body: string;
  ctaLabel: string;
  postscript: string;
}

type BuilderStep = 'info' | 'compose';

export default function NewEmailCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, user } = useAuth();
  const editingId = searchParams.get('id');

  const [draft, setDraft] = useState<CampaignDraft>({
    prompt: '',
    imageUrls: [],
    useLogos: true,
    linkToWebsite: true,
    includePhone: false,
    includeQuote: false,
    includeInsuranceStrip: false,
    includeSocialFooter: false,
    darkMode: false,
    featuredBlogId: null,
    featuredEpisodeSlug: null,
    featuredPagePath: null,
    featuredEmployeeId: null,
    featuredEquineId: null,
    generatedHtml: null,
    generatedSubject: null,
  });
  const [libraryAssets, setLibraryAssets] = useState<LibraryImage[]>([]);
  const [blogs, setBlogs] = useState<BlogOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [horses, setHorses] = useState<HorseOption[]>([]);
  const [blogPickerOpen, setBlogPickerOpen] = useState(false);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [horsePickerOpen, setHorsePickerOpen] = useState(false);
  const [pagePickerOpen, setPagePickerOpen] = useState(false);
  // The Preview pane shows a "Replace images" button that opens
  // this picker; on confirm the selection swap is committed AND a
  // fresh rebuild is kicked off so the marketer never has to
  // remember the second step.
  const [replaceImagesOpen, setReplaceImagesOpen] = useState(false);
  const [iterateNote, setIterateNote] = useState('');
  const [building, setBuilding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Two-step builder: gather intent first (prompt + toggles + blog +
  // employee), then on Continue draft the email text + reveal the
  // image picker + Build. Resuming an existing draft jumps straight
  // to 'compose'.
  const [step, setStep] = useState<BuilderStep>('info');
  const [draftText, setDraftText] = useState<DraftText>({ headline: '', body: '', ctaLabel: '', postscript: '' });
  const [drafting, setDrafting] = useState(false);

  // AbortControllers for the two long-running fetches (Continue
  // drafts the text, Build composes the HTML). The "Wait, stop!"
  // button next to the progress bar calls .abort() so the
  // marketer can change their mind mid-call without sitting
  // through a 20s round-trip.
  const draftControllerRef = useRef<AbortController | null>(null);
  const buildControllerRef = useRef<AbortController | null>(null);
  const onCancelDraft = () => {
    draftControllerRef.current?.abort();
    draftControllerRef.current = null;
  };
  const onCancelBuild = () => {
    buildControllerRef.current?.abort();
    buildControllerRef.current = null;
  };

  // Hydrate from an existing draft when ?id is set so a marketer
  // can resume a saved campaign without starting over.
  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('email_campaigns')
        .select('id, prompt, image_urls, use_logos, link_to_website, include_phone, include_quote, include_insurance_strip, include_social_footer, dark_mode, featured_blog_id, featured_episode_slug, featured_page_path, featured_employee_id, featured_equine_id, generated_html, generated_subject')
        .eq('id', editingId)
        .maybeSingle();
      if (cancelled || !data) return;
      setDraft({
        id: data.id,
        prompt: data.prompt ?? '',
        imageUrls: Array.isArray(data.image_urls) ? (data.image_urls as string[]) : [],
        useLogos: !!data.use_logos,
        linkToWebsite: !!data.link_to_website,
        includePhone: !!data.include_phone,
        includeQuote: !!data.include_quote,
        includeInsuranceStrip: !!data.include_insurance_strip,
        includeSocialFooter: !!data.include_social_footer,
        darkMode: !!data.dark_mode,
        featuredBlogId: data.featured_blog_id ?? null,
        featuredEpisodeSlug: data.featured_episode_slug ?? null,
        featuredPagePath: data.featured_page_path ?? null,
        featuredEmployeeId: data.featured_employee_id ?? null,
        featuredEquineId: data.featured_equine_id ?? null,
        generatedHtml: data.generated_html ?? null,
        generatedSubject: data.generated_subject ?? null,
      });
      // Resuming a previously-started draft drops straight into the
      // compose step so the marketer can keep iterating instead of
      // re-walking the info form.
      setStep('compose');
    })();
    return () => { cancelled = true; };
  }, [editingId]);

  // Library + blog + employee options.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Episodes come from the merged endpoint (static EPISODES +
      // published AI blogs, newest first, hidden-slug filtered) so
      // the blog picker can show the full Recovery Roadmap catalogue
      // with episode numbers, not just the AI-pipeline subset.
      const [imagesRes, episodesRes, usersRes, horsesRes] = await Promise.all([
        supabase.from('site_images')
          .select('id, public_url, filename')
          .order('created_at', { ascending: false })
          .limit(200),
        fetch('/api/episodes/list', { credentials: 'include', cache: 'no-store' }),
        supabase.from('users')
          .select('id, full_name, job_title, avatar_url, status')
          .eq('status', 'active')
          .order('full_name', { ascending: true })
          .limit(100),
        supabase.from('equine')
          .select('id, name, image_url, works_in')
          .order('name', { ascending: true })
          .limit(50),
      ]);
      if (cancelled) return;
      const imageRows = (imagesRes.data ?? []) as Array<{ id: string; public_url: string; filename: string | null }>;
      setLibraryAssets(imageRows.map((r) => ({ id: r.id, url: r.public_url, filename: r.filename })));

      let episodeRows: Array<{
        number: number;
        slug: string;
        title: string;
        href: string;
        blog_id: string | null;
        coverImageUrl: string | null;
        coverImageAlt: string | null;
      }> = [];
      try {
        if (episodesRes.ok) {
          const json = (await episodesRes.json()) as { rows: typeof episodeRows };
          if (Array.isArray(json.rows)) episodeRows = json.rows;
        }
      } catch {
        /* fallthrough — empty list, picker just shows nothing */
      }
      setBlogs(episodeRows.map((ep): BlogOption => ({
        // DB-backed episodes use the blogs.id UUID so the existing
        // featured_blog_id column keeps working. Static episodes use
        // an "episode:" prefix so the lookup paths can't collide.
        id: ep.blog_id ?? `episode:${ep.slug}`,
        title: ep.title,
        slug: ep.slug,
        number: ep.number,
        isStaticEpisode: ep.blog_id == null,
        coverImageUrl: ep.coverImageUrl,
        coverImageAlt: ep.coverImageAlt,
      })));
      setEmployees((usersRes.data ?? []) as EmployeeOption[]);
      setHorses((horsesRes.data ?? []) as HorseOption[]);
    })();
    return () => { cancelled = true; };
  }, []);

  // featuredBlog resolves whichever of the two storage slots is
  // populated — featured_blog_id (UUID) for AI-pipeline posts, or
  // featured_episode_slug for static Recovery Roadmap episodes. The
  // picker writes one and clears the other so they can't both be
  // set at once.
  const featuredBlog = useMemo(() => {
    if (draft.featuredBlogId) return blogs.find((b) => b.id === draft.featuredBlogId) ?? null;
    if (draft.featuredEpisodeSlug) return blogs.find((b) => b.isStaticEpisode && b.slug === draft.featuredEpisodeSlug) ?? null;
    return null;
  }, [blogs, draft.featuredBlogId, draft.featuredEpisodeSlug]);
  const featuredPage = useMemo(
    () => findSitePage(draft.featuredPagePath),
    [draft.featuredPagePath],
  );
  const featuredEmployee = useMemo(
    () => employees.find((e) => e.id === draft.featuredEmployeeId) ?? null,
    [employees, draft.featuredEmployeeId],
  );
  const featuredHorse = useMemo(
    () => horses.find((h) => h.id === draft.featuredEquineId) ?? null,
    [horses, draft.featuredEquineId],
  );

  // Picker selection helpers — clear the sibling slot so featured
  // blog ID + episode slug can never both be set, and the saved
  // payload mirrors that constraint.
  const setFeaturedBlogChoice = (chosen: BlogOption | null) => {
    if (!chosen) {
      setDraft((p) => ({ ...p, featuredBlogId: null, featuredEpisodeSlug: null }));
      return;
    }
    if (chosen.isStaticEpisode) {
      setDraft((p) => ({ ...p, featuredBlogId: null, featuredEpisodeSlug: chosen.slug ?? null }));
    } else {
      setDraft((p) => ({ ...p, featuredBlogId: chosen.id, featuredEpisodeSlug: null }));
    }
  };

  const toggleImage = (url: string) => {
    setDraft((prev) => {
      const has = prev.imageUrls.includes(url);
      return {
        ...prev,
        imageUrls: has ? prev.imageUrls.filter((u) => u !== url) : [...prev.imageUrls, url],
      };
    });
  };

  // Continue: draft the email text from the info inputs and
  // advance to the compose step. The drafted text is editable on
  // the same page next to the image picker.
  const onContinue = async () => {
    if (!session?.access_token || drafting) return;
    if (draft.prompt.trim().length === 0) {
      setError('Type a paragraph describing what the email should say.');
      return;
    }
    setError(null);
    setDrafting(true);
    const controller = new AbortController();
    draftControllerRef.current = controller;
    try {
      const res = await fetch('/api/email-campaigns/draft-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: draft.prompt,
          useLogos: draft.useLogos,
          linkToWebsite: draft.linkToWebsite,
          includePhone: draft.includePhone,
          includeQuote: draft.includeQuote,
          includeInsuranceStrip: draft.includeInsuranceStrip,
          includeSocialFooter: draft.includeSocialFooter,
          darkMode: draft.darkMode,
          featuredBlogId: draft.featuredBlogId,
          featuredEpisodeSlug: draft.featuredEpisodeSlug,
          featuredPagePath: draft.featuredPagePath,
          featuredEmployeeId: draft.featuredEmployeeId,
          featuredEquineId: draft.featuredEquineId,
        }),
        signal: controller.signal,
      });
      const json = (await res.json().catch(() => ({}))) as Partial<DraftText> & { error?: string };
      if (!res.ok || !json.body) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setDraftText({
        headline: json.headline ?? '',
        body: json.body ?? '',
        ctaLabel: json.ctaLabel ?? '',
        postscript: json.postscript ?? '',
      });
      setStep('compose');
    } catch (err) {
      // Treat user-initiated cancellation as a no-op, not an error.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      draftControllerRef.current = null;
      setDrafting(false);
    }
  };

  // Optional overrides let callers (e.g. the "Replace images"
  // modal) trigger a fresh build with new inputs without waiting
  // for a setDraft round-trip to flush before the build fires.
  const onBuild = async (mode: 'fresh' | 'iterate', overrides?: { imageUrls?: string[] }) => {
    if (!session?.access_token || building) return;
    if (draft.prompt.trim().length === 0 && mode === 'fresh') {
      setError('Type a paragraph describing what the email should say.');
      return;
    }
    setError(null);
    setBuilding(true);
    const controller = new AbortController();
    buildControllerRef.current = controller;
    try {
      const res = await fetch('/api/email-campaigns/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: draft.prompt,
          imageUrls: overrides?.imageUrls ?? draft.imageUrls,
          useLogos: draft.useLogos,
          linkToWebsite: draft.linkToWebsite,
          includePhone: draft.includePhone,
          includeQuote: draft.includeQuote,
          includeInsuranceStrip: draft.includeInsuranceStrip,
          includeSocialFooter: draft.includeSocialFooter,
          darkMode: draft.darkMode,
          featuredBlogId: draft.featuredBlogId,
          featuredEpisodeSlug: draft.featuredEpisodeSlug,
          featuredPagePath: draft.featuredPagePath,
          featuredEmployeeId: draft.featuredEmployeeId,
          featuredEquineId: draft.featuredEquineId,
          previousHtml: mode === 'iterate' ? draft.generatedHtml : null,
          iterationNote: mode === 'iterate' ? iterateNote : null,
          // Pass the (possibly edited) draft text so Claude uses the
          // exact copy the marketer signed off on.
          draftText: mode === 'iterate' ? null : draftText,
        }),
        signal: controller.signal,
      });
      const json = (await res.json().catch(() => ({}))) as { html?: string; subject?: string; error?: string };
      if (!res.ok || !json.html) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setDraft((prev) => ({
        ...prev,
        generatedHtml: json.html ?? prev.generatedHtml,
        generatedSubject: json.subject ?? prev.generatedSubject,
      }));
      if (mode === 'iterate') setIterateNote('');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      buildControllerRef.current = null;
      setBuilding(false);
    }
  };

  const onSaveAndContinue = async () => {
    if (!draft.generatedHtml) {
      setError('Build the email first, then save.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        prompt: draft.prompt,
        image_urls: draft.imageUrls,
        use_logos: draft.useLogos,
        link_to_website: draft.linkToWebsite,
        include_phone: draft.includePhone,
        include_quote: draft.includeQuote,
        include_insurance_strip: draft.includeInsuranceStrip,
        include_social_footer: draft.includeSocialFooter,
        dark_mode: draft.darkMode,
        featured_blog_id: draft.featuredBlogId,
        featured_episode_slug: draft.featuredEpisodeSlug,
        featured_page_path: draft.featuredPagePath,
        featured_employee_id: draft.featuredEmployeeId,
        featured_equine_id: draft.featuredEquineId,
        generated_html: draft.generatedHtml,
        generated_subject: draft.generatedSubject,
        status: 'recipients',
        created_by: user?.id ?? null,
      };
      let id = draft.id;
      if (id) {
        const { error: updErr } = await supabase
          .from('email_campaigns')
          .update(payload)
          .eq('id', id);
        if (updErr) throw new Error(updErr.message);
      } else {
        const { data, error: insErr } = await supabase
          .from('email_campaigns')
          .insert(payload)
          .select('id')
          .single();
        if (insErr) throw new Error(insErr.message);
        id = data.id;
      }
      router.push(`/app/email-campaigns/${id}/recipients`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-5 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
            Email Campaigns · {editingId ? 'Edit draft' : 'New campaign'}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Build the email
          </h1>
          <p className="mt-1 text-[12.5px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
            Describe what you want to say. Claude will turn it into a polished HTML email you can iterate before saving.
          </p>
        </div>
        <Link
          href="/app/email-campaigns"
          className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
        >
          ← Back
        </Link>
      </header>

      {/* Prompt */}
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-1.5">
          What should the email say?
        </p>
        <textarea
          value={draft.prompt}
          onChange={(e) => setDraft((p) => ({ ...p, prompt: e.target.value }))}
          rows={6}
          placeholder="Write a paragraph describing the message, the audience, and the call to action."
          className="w-full px-3 py-2 rounded-md border border-black/10 text-[13.5px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </section>

      {/* Compose step — text editor first, image picker second.
          Hidden in the info step so the page stays focused on
          intent until the marketer hits Continue. */}
      {step === 'compose' && (
        <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">
            Email text
          </p>
          <p className="text-[11.5px] text-foreground/55 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
            Drafted from your brief. Edit anything you'd like before building the designed email.
          </p>

          <label className="block mb-3">
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">Headline</span>
            <input
              type="text"
              value={draftText.headline}
              onChange={(e) => setDraftText((t) => ({ ...t, headline: e.target.value }))}
              placeholder="One line headline"
              className="mt-1 w-full px-3 py-2 rounded-md border border-black/10 text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </label>

          <label className="block mb-3">
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">Body</span>
            <textarea
              value={draftText.body}
              onChange={(e) => setDraftText((t) => ({ ...t, body: e.target.value }))}
              rows={8}
              placeholder="Paragraphs of the email body, blank line between paragraphs."
              className="mt-1 w-full px-3 py-2 rounded-md border border-black/10 text-[13.5px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1">
            <label className="block">
              <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">CTA label</span>
              <input
                type="text"
                value={draftText.ctaLabel}
                onChange={(e) => setDraftText((t) => ({ ...t, ctaLabel: e.target.value }))}
                placeholder={draft.linkToWebsite ? 'e.g. Learn More' : '(no CTA, link to website is off)'}
                disabled={!draft.linkToWebsite}
                className="mt-1 w-full px-3 py-2 rounded-md border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">P.S. (optional)</span>
              <input
                type="text"
                value={draftText.postscript}
                onChange={(e) => setDraftText((t) => ({ ...t, postscript: e.target.value }))}
                placeholder="Optional one-line P.S."
                className="mt-1 w-full px-3 py-2 rounded-md border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </label>
          </div>
        </section>
      )}

      {/* Images — inline picker. Selected thumbs surface at the top
          with a removable ✕ overlay; the full library grid sits
          below so picking + reviewing live on the same scroll. */}
      {step === 'compose' && (
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Images · {draft.imageUrls.length} selected · {libraryAssets.length} in library
          </p>
          {draft.imageUrls.length > 0 && (
            <button
              type="button"
              onClick={() => setDraft((p) => ({ ...p, imageUrls: [] }))}
              className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
            >
              Clear all
            </button>
          )}
        </div>

        {draft.imageUrls.length > 0 && (
          <ul className="flex flex-wrap gap-2 mb-3">
            {draft.imageUrls.map((url) => (
              <li key={url} className="relative w-24 h-24 rounded-lg overflow-hidden border border-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => toggleImage(url)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] leading-none hover:bg-black"
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">
            Library
          </p>
          {libraryAssets.length === 0 ? (
            <p className="text-[12.5px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
              Library is empty. Upload images via /app/images first.
            </p>
          ) : (
            <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[420px] overflow-y-auto pr-1">
              {libraryAssets.map((a) => {
                const isSelected = draft.imageUrls.includes(a.url);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => toggleImage(a.url)}
                      className={`relative w-full aspect-square rounded-md overflow-hidden border-2 transition-all ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-black/10 hover:border-primary'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt={a.filename ?? ''} className="w-full h-full object-cover" />
                      {isSelected && (
                        <span className="absolute top-1 right-1 px-1 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-primary text-white">
                          Selected
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      )}

      {/* Toggles */}
      {step === 'info' && (
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Toggle
          label="Use logos"
          description="Drop the Seven Arrows logo into the email header."
          on={draft.useLogos}
          onChange={(v) => setDraft((p) => ({ ...p, useLogos: v }))}
        />
        <Toggle
          label="Link to website"
          description="Add a primary CTA button linking to sevenarrowsrecoveryarizona.com."
          on={draft.linkToWebsite}
          onChange={(v) => setDraft((p) => ({ ...p, linkToWebsite: v }))}
        />
        <Toggle
          label="Include phone number"
          description="Surface (866) 718-1665 inside the email."
          on={draft.includePhone}
          onChange={(v) => setDraft((p) => ({ ...p, includePhone: v }))}
        />
        <Toggle
          label="Add a quote"
          description="Pull a top Google review into the email as a block quote."
          on={draft.includeQuote}
          onChange={(v) => setDraft((p) => ({ ...p, includeQuote: v }))}
        />
        <Toggle
          label="Insurance strip"
          description="Aetna, BCBS, Cigna, Humana, TRICARE logo row near the top so coverage reads at a glance."
          on={draft.includeInsuranceStrip}
          onChange={(v) => setDraft((p) => ({ ...p, includeInsuranceStrip: v }))}
        />
        <Toggle
          label="Social row"
          description="Instagram, Facebook, LinkedIn icons in the footer, linking to the 7A handles."
          on={draft.includeSocialFooter}
          onChange={(v) => setDraft((p) => ({ ...p, includeSocialFooter: v }))}
        />
        <Toggle
          label={draft.darkMode ? 'Dark mode' : 'Light mode'}
          description={
            draft.darkMode
              ? 'Body renders with the Desert Dusk background and Bone text.'
              : 'Body renders with the Sand background and Ink text.'
          }
          on={draft.darkMode}
          onChange={(v) => setDraft((p) => ({ ...p, darkMode: v }))}
        />
      </section>
      )}

      {/* Featured blog */}
      {step === 'info' && (
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Featured blog
          </p>
          <button
            type="button"
            onClick={() => setBlogPickerOpen(true)}
            className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          >
            {featuredBlog ? 'Change blog' : '+ Feature a blog'}
          </button>
        </div>
        {featuredBlog ? (
          <FeaturedBlogCard blog={featuredBlog} onClear={() => setFeaturedBlogChoice(null)} />
        ) : (
          <p className="text-[12.5px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
            Optional. Surface a blog post inside the email so readers have somewhere to land after the CTA.
          </p>
        )}
      </section>
      )}

      {/* Featured employee */}
      {step === 'info' && (
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Featured employee
          </p>
          <button
            type="button"
            onClick={() => setEmployeePickerOpen(true)}
            className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          >
            {featuredEmployee ? 'Change employee' : '+ Feature an employee'}
          </button>
        </div>
        {featuredEmployee ? (
          <FeaturedEmployeeCard
            employee={featuredEmployee}
            onClear={() => setDraft((p) => ({ ...p, featuredEmployeeId: null }))}
          />
        ) : (
          <p className="text-[12.5px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
            Optional. Give the email a face. Claude weaves their name + title into the copy.
          </p>
        )}
      </section>
      )}

      {/* Featured horse */}
      {step === 'info' && (
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Featured horse
          </p>
          <button
            type="button"
            onClick={() => setHorsePickerOpen(true)}
            className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          >
            {featuredHorse ? 'Change horse' : '+ Feature a horse'}
          </button>
        </div>
        {featuredHorse ? (
          <FeaturedHorseCard
            horse={featuredHorse}
            onClear={() => setDraft((p) => ({ ...p, featuredEquineId: null }))}
          />
        ) : (
          <p className="text-[12.5px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
            Optional. Spotlight a member of the herd. Claude works the horse's name into the copy and uses the herd photo.
          </p>
        )}
      </section>
      )}

      {/* Featured page — pick any inner marketing page (admissions,
          /our-program/equine-assisted, /what-we-treat/alcohol-
          addiction, etc.) and Claude weaves a tasteful card under
          the body that links to it. */}
      {step === 'info' && (
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Featured page
          </p>
          <button
            type="button"
            onClick={() => setPagePickerOpen(true)}
            className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          >
            {featuredPage ? 'Change page' : '+ Feature a page'}
          </button>
        </div>
        {featuredPage ? (
          <FeaturedPageCard
            page={featuredPage}
            onClear={() => setDraft((p) => ({ ...p, featuredPagePath: null }))}
          />
        ) : (
          <p className="text-[12.5px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
            Optional. Surface an inner page of the site (admissions, our-program, what-we-treat, etc.) as a secondary destination under the body.
          </p>
        )}
      </section>
      )}

      {/* Continue button — advances from info to compose, drafting
          the email text via Claude on the way. Shown only on the
          info step. */}
      {step === 'info' && (
        <div className="mb-4 rounded-2xl border border-black/10 bg-white p-4">
          {drafting && (
            <div className="mb-3">
              <BuildProgress mode="fresh" />
              <div className="mt-2 flex justify-end">
                <CancelButton onClick={onCancelDraft} />
              </div>
            </div>
          )}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onContinue}
              disabled={drafting || !session?.access_token || draft.prompt.trim().length === 0}
              className="px-5 py-2.5 rounded-md bg-primary text-white text-[12.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {drafting ? 'Drafting…' : 'Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* Build button — only in the compose step */}
      {step === 'compose' && !draft.generatedHtml && (
        <div className="mb-4">
          {building && (
            <div className="mb-3">
              <BuildProgress mode="fresh" />
              <div className="mt-2 flex justify-end">
                <CancelButton onClick={onCancelBuild} />
              </div>
            </div>
          )}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => onBuild('fresh')}
              disabled={building || !session?.access_token}
              className="px-5 py-2.5 rounded-md bg-primary text-white text-[12.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {building ? 'Building…' : 'Build email'}
            </button>
          </div>
        </div>
      )}

      {/* Preview + iterate */}
      {step === 'compose' && draft.generatedHtml && (
        <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
          <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
                Preview
              </p>
              {draft.generatedSubject && (
                <p className="text-[12px] text-foreground/55 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  <span className="font-semibold text-foreground/75">Subject:</span> {draft.generatedSubject}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setReplaceImagesOpen(true)}
                disabled={building}
                className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60 disabled:opacity-50"
              >
                ⇄ Replace images
              </button>
              <button
                type="button"
                onClick={() => onBuild('fresh')}
                disabled={building}
                className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60 disabled:opacity-50"
              >
                {building ? 'Rebuilding…' : '↻ Rebuild from scratch'}
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-black/10 overflow-hidden bg-warm-bg/30">
            <iframe
              srcDoc={draft.generatedHtml}
              title="Email preview"
              sandbox=""
              className="w-full h-[560px] bg-white"
            />
          </div>

          <div className="mt-4 rounded-xl border border-black/10 bg-warm-bg/30 p-3">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-1.5">
              Iterate
            </p>
            <textarea
              value={iterateNote}
              onChange={(e) => setIterateNote(e.target.value)}
              rows={3}
              placeholder="Make the subject more urgent. Move the blog feature higher. Add a P.S. about insurance verification."
              className="w-full px-3 py-2 rounded-md border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            {building && (
              <div className="mt-2">
                <BuildProgress mode="iterate" />
                <div className="mt-2 flex justify-end">
                  <CancelButton onClick={onCancelBuild} />
                </div>
              </div>
            )}
            <div className="mt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onBuild('iterate')}
                disabled={building || iterateNote.trim().length === 0}
                className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold uppercase tracking-wider hover:bg-foreground/85 disabled:opacity-50"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {building ? 'Iterating…' : 'Iterate'}
              </button>
            </div>
          </div>
        </section>
      )}

      {error && <p className="mb-3 text-[12px] text-red-700" role="alert">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Link
          href="/app/email-campaigns"
          className="px-4 py-2 rounded-md border border-black/10 bg-white text-[12px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={onSaveAndContinue}
          disabled={saving || !draft.generatedHtml}
          className="px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {saving ? 'Saving…' : 'Save and continue →'}
        </button>
      </div>

      {blogPickerOpen && (
        <BlogPicker
          blogs={blogs}
          selectedId={featuredBlog?.id ?? null}
          onSelect={(chosen) => {
            setFeaturedBlogChoice(chosen);
            setBlogPickerOpen(false);
          }}
          onClose={() => setBlogPickerOpen(false)}
        />
      )}
      {employeePickerOpen && (
        <EmployeePicker
          employees={employees}
          selectedId={draft.featuredEmployeeId}
          onSelect={(id) => {
            setDraft((p) => ({ ...p, featuredEmployeeId: id }));
            setEmployeePickerOpen(false);
          }}
          onClose={() => setEmployeePickerOpen(false)}
        />
      )}
      {horsePickerOpen && (
        <HorsePicker
          horses={horses}
          selectedId={draft.featuredEquineId}
          onSelect={(id) => {
            setDraft((p) => ({ ...p, featuredEquineId: id }));
            setHorsePickerOpen(false);
          }}
          onClose={() => setHorsePickerOpen(false)}
        />
      )}
      {pagePickerOpen && (
        <PagePicker
          selectedPath={draft.featuredPagePath}
          onSelect={(path) => {
            setDraft((p) => ({ ...p, featuredPagePath: path }));
            setPagePickerOpen(false);
          }}
          onClose={() => setPagePickerOpen(false)}
        />
      )}
      {replaceImagesOpen && (
        <ReplaceImagesModal
          assets={libraryAssets}
          initialSelected={draft.imageUrls}
          onClose={() => setReplaceImagesOpen(false)}
          onConfirm={(urls) => {
            setDraft((p) => ({ ...p, imageUrls: urls }));
            setReplaceImagesOpen(false);
            // Kick off the rebuild on the next tick so the state
            // update flushes first; otherwise onBuild would read
            // the stale imageUrls.
            window.setTimeout(() => { void onBuild('fresh'); }, 0);
          }}
        />
      )}
    </div>
  );
}

// "Wait, stop!" — aborts an in-flight draft / build fetch so the
// marketer can change their mind without waiting through a 20s
// round-trip to Claude. Styled to look like a soft destructive
// secondary so it's visually different from the primary Build /
// Continue affordances.
export function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-md border border-red-300 bg-red-50 text-[11.5px] font-semibold text-red-900 hover:bg-red-100"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      Wait, stop!
    </button>
  );
}

function PagePicker({ selectedPath, onSelect, onClose }: {
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SITE_PAGES;
    return SITE_PAGES.filter((p) =>
      p.title.toLowerCase().includes(q)
      || p.path.toLowerCase().includes(q)
      || p.blurb.toLowerCase().includes(q)
      || p.group.toLowerCase().includes(q),
    );
  }, [query]);
  // Group rows by their `group` for the sectioned list view.
  const grouped = useMemo(() => {
    const map = new Map<SitePage['group'], SitePage[]>();
    for (const p of filtered) {
      const slot = map.get(p.group) ?? [];
      slot.push(p);
      map.set(p.group, slot);
    }
    return SITE_PAGE_GROUPS.map((g) => ({ group: g, rows: map.get(g) ?? [] })).filter((s) => s.rows.length > 0);
  }, [filtered]);
  return (
    <ModalShell title="Feature a page" subtitle={`${SITE_PAGES.length} marketing pages, grouped.`} onClose={onClose}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title, path, or group…"
        className="w-full mb-3 px-3 py-1.5 rounded-md border border-black/10 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        style={{ fontFamily: 'var(--font-body)' }}
      />
      {filtered.length === 0 ? (
        <p className="text-[12.5px] text-foreground/55 italic text-center py-12" style={{ fontFamily: 'var(--font-body)' }}>
          No pages match that search.
        </p>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-3">
          {grouped.map(({ group, rows }) => (
            <div key={group}>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-foreground/45 mb-1.5 px-0.5">
                {group}
              </p>
              <ul className="flex flex-col gap-1.5">
                {rows.map((p) => {
                  const isSelected = p.path === selectedPath;
                  return (
                    <li key={p.path}>
                      <button
                        type="button"
                        onClick={() => onSelect(p.path)}
                        className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-black/10 bg-white hover:bg-warm-bg/40'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>{p.title}</p>
                          <p className="text-[11px] text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>{p.path}</p>
                          <p className="text-[10.5px] text-foreground/45 truncate" style={{ fontFamily: 'var(--font-body)' }}>{p.blurb}</p>
                        </div>
                        {isSelected && (
                          <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold" aria-label="Selected">✓</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function BlogPicker({ blogs, selectedId, onSelect, onClose }: {
  blogs: BlogOption[];
  selectedId: string | null;
  onSelect: (option: BlogOption | null) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell title="Feature a blog post" subtitle={`${blogs.length} episode${blogs.length === 1 ? '' : 's'}, newest first.`} onClose={onClose}>
      {blogs.length === 0 ? (
        <p className="text-[12.5px] text-foreground/55 italic text-center py-12" style={{ fontFamily: 'var(--font-body)' }}>
          No published episodes yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {blogs.map((b) => {
            const isSelected = b.id === selectedId;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onSelect(b)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-black/10 bg-white hover:bg-warm-bg/40'}`}
                >
                  {b.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.coverImageUrl}
                      alt={b.coverImageAlt ?? ''}
                      className="w-14 h-14 rounded-md object-cover border border-black/10 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-md bg-warm-bg/60 border border-black/10 shrink-0 flex items-center justify-center text-foreground/35 text-[10px]">
                      Blog
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {b.number != null && (
                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.14em] bg-primary/15 text-primary ring-1 ring-primary/25">
                          Ep {b.number}
                        </span>
                      )}
                      <p className="text-[13px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>{b.title}</p>
                    </div>
                    {b.slug && (
                      <p className="mt-0.5 text-[11px] text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>/{b.slug}</p>
                    )}
                  </div>
                  {isSelected && (
                    <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold" aria-label="Selected">✓</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ModalShell>
  );
}

function EmployeePicker({ employees, selectedId, onSelect, onClose }: {
  employees: EmployeeOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      e.full_name.toLowerCase().includes(q) || (e.job_title ?? '').toLowerCase().includes(q),
    );
  }, [employees, query]);
  return (
    <ModalShell title="Feature an employee" subtitle={`${employees.length} active.`} onClose={onClose}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or title…"
        className="w-full mb-3 px-3 py-1.5 rounded-md border border-black/10 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        style={{ fontFamily: 'var(--font-body)' }}
      />
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map((e) => {
          const isSelected = e.id === selectedId;
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onSelect(e.id)}
                className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-black/10 bg-white hover:bg-warm-bg/40'}`}
              >
                {e.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border border-black/10 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-warm-bg/60 border border-black/10 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>{e.full_name}</p>
                  {e.job_title && (
                    <p className="text-[11px] text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>{e.job_title}</p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </ModalShell>
  );
}

function HorsePicker({ horses, selectedId, onSelect, onClose }: {
  horses: HorseOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell title="Feature a horse" subtitle={`${horses.length} in the herd.`} onClose={onClose}>
      {horses.length === 0 ? (
        <p className="text-[12.5px] text-foreground/55 italic text-center py-12" style={{ fontFamily: 'var(--font-body)' }}>
          No horses yet. Add one from /app/equine first.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {horses.map((h) => {
            const isSelected = h.id === selectedId;
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => onSelect(h.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-black/10 bg-white hover:bg-warm-bg/40'}`}
                >
                  {h.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={h.image_url}
                      alt={h.name}
                      className="w-12 h-12 rounded-full object-cover border border-black/10 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-warm-bg/60 border border-black/10 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>{h.name}</p>
                    {h.works_in && (
                      <p className="text-[11px] text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>{h.works_in}</p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ModalShell>
  );
}

// Replace-images flow from the Preview pane. Reuses the same
// grid as the inline picker but inside a modal, with a Save
// button that confirms the new selection so the parent can
// kick off a fresh rebuild.
function ReplaceImagesModal({
  assets, initialSelected, onConfirm, onClose,
}: {
  assets: LibraryImage[];
  initialSelected: string[];
  onConfirm: (urls: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));
  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  };
  return (
    <ModalShell
      title="Replace images"
      subtitle={`${selected.size} selected · ${assets.length} in library`}
      onClose={onClose}
    >
      {assets.length === 0 ? (
        <p className="text-[12.5px] text-foreground/55 italic text-center py-12" style={{ fontFamily: 'var(--font-body)' }}>
          Library is empty. Upload images via /app/images first.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
            {assets.map((a) => {
              const isSelected = selected.has(a.url);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => toggle(a.url)}
                    className={`relative w-full aspect-square rounded-md overflow-hidden border-2 transition-all ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-black/10 hover:border-primary'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.filename ?? ''} className="w-full h-full object-cover" />
                    {isSelected && (
                      <span className="absolute top-1 right-1 px-1 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-primary text-white">
                        Selected
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-end gap-2 sticky bottom-0 bg-white pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11.5px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(Array.from(selected))}
              className="px-3 py-1.5 rounded-md bg-primary text-white text-[11.5px] font-semibold uppercase tracking-wider hover:bg-primary/90"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Save and rebuild
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
