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
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

interface LibraryImage {
  id: string;
  url: string;
  filename: string | null;
}

interface BlogOption {
  id: string;
  title: string;
  slug: string | null;
}

interface EmployeeOption {
  id: string;
  full_name: string;
  job_title: string | null;
  avatar_url: string | null;
}

interface CampaignDraft {
  id?: string;
  prompt: string;
  imageUrls: string[];
  useLogos: boolean;
  linkToWebsite: boolean;
  featuredBlogId: string | null;
  featuredEmployeeId: string | null;
  generatedHtml: string | null;
  generatedSubject: string | null;
}

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
    featuredBlogId: null,
    featuredEmployeeId: null,
    generatedHtml: null,
    generatedSubject: null,
  });
  const [libraryAssets, setLibraryAssets] = useState<LibraryImage[]>([]);
  const [blogs, setBlogs] = useState<BlogOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [blogPickerOpen, setBlogPickerOpen] = useState(false);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [iterateNote, setIterateNote] = useState('');
  const [building, setBuilding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from an existing draft when ?id is set so a marketer
  // can resume a saved campaign without starting over.
  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('email_campaigns')
        .select('id, prompt, image_urls, use_logos, link_to_website, featured_blog_id, featured_employee_id, generated_html, generated_subject')
        .eq('id', editingId)
        .maybeSingle();
      if (cancelled || !data) return;
      setDraft({
        id: data.id,
        prompt: data.prompt ?? '',
        imageUrls: Array.isArray(data.image_urls) ? (data.image_urls as string[]) : [],
        useLogos: !!data.use_logos,
        linkToWebsite: !!data.link_to_website,
        featuredBlogId: data.featured_blog_id ?? null,
        featuredEmployeeId: data.featured_employee_id ?? null,
        generatedHtml: data.generated_html ?? null,
        generatedSubject: data.generated_subject ?? null,
      });
    })();
    return () => { cancelled = true; };
  }, [editingId]);

  // Library + blog + employee options.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [imagesRes, blogsRes, usersRes] = await Promise.all([
        supabase.from('site_images')
          .select('id, public_url, filename')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('blogs')
          .select('id, title, slug')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('users')
          .select('id, full_name, job_title, avatar_url, status')
          .eq('status', 'active')
          .order('full_name', { ascending: true })
          .limit(100),
      ]);
      if (cancelled) return;
      const imageRows = (imagesRes.data ?? []) as Array<{ id: string; public_url: string; filename: string | null }>;
      setLibraryAssets(imageRows.map((r) => ({ id: r.id, url: r.public_url, filename: r.filename })));
      setBlogs((blogsRes.data ?? []) as BlogOption[]);
      setEmployees((usersRes.data ?? []) as EmployeeOption[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const featuredBlog = useMemo(
    () => blogs.find((b) => b.id === draft.featuredBlogId) ?? null,
    [blogs, draft.featuredBlogId],
  );
  const featuredEmployee = useMemo(
    () => employees.find((e) => e.id === draft.featuredEmployeeId) ?? null,
    [employees, draft.featuredEmployeeId],
  );

  const toggleImage = (url: string) => {
    setDraft((prev) => {
      const has = prev.imageUrls.includes(url);
      return {
        ...prev,
        imageUrls: has ? prev.imageUrls.filter((u) => u !== url) : [...prev.imageUrls, url],
      };
    });
  };

  const onBuild = async (mode: 'fresh' | 'iterate') => {
    if (!session?.access_token || building) return;
    if (draft.prompt.trim().length === 0 && mode === 'fresh') {
      setError('Type a paragraph describing what the email should say.');
      return;
    }
    setError(null);
    setBuilding(true);
    try {
      const res = await fetch('/api/email-campaigns/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: draft.prompt,
          imageUrls: draft.imageUrls,
          useLogos: draft.useLogos,
          linkToWebsite: draft.linkToWebsite,
          featuredBlogId: draft.featuredBlogId,
          featuredEmployeeId: draft.featuredEmployeeId,
          previousHtml: mode === 'iterate' ? draft.generatedHtml : null,
          iterationNote: mode === 'iterate' ? iterateNote : null,
        }),
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
      setError(err instanceof Error ? err.message : String(err));
    } finally {
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
        featured_blog_id: draft.featuredBlogId,
        featured_employee_id: draft.featuredEmployeeId,
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

      {/* Images */}
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Images · {draft.imageUrls.length}
          </p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          >
            + Pick from library
          </button>
        </div>
        {draft.imageUrls.length === 0 ? (
          <p className="text-[12.5px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
            No images yet. Pick from the library to give Claude something to drop into the email.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
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
      </section>

      {/* Toggles */}
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </section>

      {/* Featured blog */}
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
          <FeaturedBlogCard blog={featuredBlog} onClear={() => setDraft((p) => ({ ...p, featuredBlogId: null }))} />
        ) : (
          <p className="text-[12.5px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
            Optional — surface a blog post inside the email so readers have somewhere to land after the CTA.
          </p>
        )}
      </section>

      {/* Featured employee */}
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
            Optional — give the email a face. Claude weaves their name + title into the copy.
          </p>
        )}
      </section>

      {/* Build button */}
      {!draft.generatedHtml && (
        <div className="flex items-center justify-end mb-4">
          <button
            type="button"
            onClick={() => onBuild('fresh')}
            disabled={building || !session?.access_token}
            className="px-5 py-2.5 rounded-md bg-primary text-white text-[12.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {building ? 'Building…' : 'Build'}
          </button>
        </div>
      )}

      {/* Preview + iterate */}
      {draft.generatedHtml && (
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
            <button
              type="button"
              onClick={() => onBuild('fresh')}
              disabled={building}
              className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60 disabled:opacity-50"
            >
              {building ? 'Rebuilding…' : '↻ Rebuild from scratch'}
            </button>
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

      {pickerOpen && (
        <LibraryPicker
          assets={libraryAssets}
          selected={new Set(draft.imageUrls)}
          onToggle={toggleImage}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {blogPickerOpen && (
        <BlogPicker
          blogs={blogs}
          selectedId={draft.featuredBlogId}
          onSelect={(id) => {
            setDraft((p) => ({ ...p, featuredBlogId: id }));
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
    </div>
  );
}

function Toggle({
  label, description, on, onChange,
}: {
  label: string;
  description: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${on ? 'border-primary bg-primary/5' : 'border-black/10 bg-white hover:bg-warm-bg/40'}`}
    >
      <span
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${on ? 'bg-primary' : 'bg-foreground/20'}`}
        aria-hidden
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px] font-semibold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>{label}</span>
        <span className="block text-[11px] text-foreground/55 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>{description}</span>
      </span>
    </button>
  );
}

function FeaturedBlogCard({ blog, onClear }: { blog: BlogOption; onClear: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="w-14 h-14 rounded-md bg-warm-bg/60 border border-black/10 flex items-center justify-center text-foreground/35 text-[10px]">
        Blog
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>{blog.title}</p>
        {blog.slug && (
          <p className="text-[11px] text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>/{blog.slug}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-[11px] text-foreground/55 hover:text-foreground"
      >
        Remove
      </button>
    </div>
  );
}

function FeaturedEmployeeCard({ employee, onClear }: { employee: EmployeeOption; onClear: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      {employee.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={employee.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border border-black/10" />
      ) : (
        <div className="w-14 h-14 rounded-full bg-warm-bg/60 border border-black/10" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>{employee.full_name}</p>
        {employee.job_title && (
          <p className="text-[11px] text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>{employee.job_title}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-[11px] text-foreground/55 hover:text-foreground"
      >
        Remove
      </button>
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[80vh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3 border-b border-black/5 flex items-baseline justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-[11.5px] text-foreground/55 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>{subtitle}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-[11px] text-foreground/55 hover:text-foreground">✕</button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function LibraryPicker({ assets, selected, onToggle, onClose }: {
  assets: LibraryImage[];
  selected: Set<string>;
  onToggle: (url: string) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell title="Pick images from library" subtitle={`${assets.length} image${assets.length === 1 ? '' : 's'}.`} onClose={onClose}>
      {assets.length === 0 ? (
        <p className="text-[12.5px] text-foreground/55 italic text-center py-12" style={{ fontFamily: 'var(--font-body)' }}>
          Library is empty. Upload images via Images first.
        </p>
      ) : (
        <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {assets.map((a) => {
            const isSelected = selected.has(a.url);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onToggle(a.url)}
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
    </ModalShell>
  );
}

function BlogPicker({ blogs, selectedId, onSelect, onClose }: {
  blogs: BlogOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell title="Feature a blog post" subtitle={`${blogs.length} post${blogs.length === 1 ? '' : 's'}.`} onClose={onClose}>
      {blogs.length === 0 ? (
        <p className="text-[12.5px] text-foreground/55 italic text-center py-12" style={{ fontFamily: 'var(--font-body)' }}>
          No blog posts yet. Publish one from /app/seo first.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {blogs.map((b) => {
            const isSelected = b.id === selectedId;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onSelect(b.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-black/10 bg-white hover:bg-warm-bg/40'}`}
                >
                  <div className="w-12 h-12 rounded-md bg-warm-bg/60 border border-black/10 shrink-0 flex items-center justify-center text-foreground/35 text-[10px]">
                    Blog
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>{b.title}</p>
                    {b.slug && (
                      <p className="text-[11px] text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>/{b.slug}</p>
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
