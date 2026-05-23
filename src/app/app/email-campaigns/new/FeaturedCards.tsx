'use client';

// Inline cards that render the marketer's current "featured" pick
// for blog / employee / horse / page. Each is the small primary-
// tinted row shown under the "+ Feature a …" button in the builder.
// Extracted from content.tsx to keep the main file under control
// — these are pure presentational components with no shared state.

import type { BlogOption, EmployeeOption, HorseOption } from './types';
import type { SitePage } from '@/lib/site-pages';

export function FeaturedBlogCard({ blog, onClear }: { blog: BlogOption; onClear: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      {blog.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={blog.coverImageUrl}
          alt={blog.coverImageAlt ?? ''}
          className="w-14 h-14 rounded-md object-cover border border-black/10 shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-md bg-warm-bg/60 border border-black/10 flex items-center justify-center text-foreground/35 text-[10px] shrink-0">
          Blog
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {blog.number != null && (
            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.14em] bg-primary/15 text-primary ring-1 ring-primary/25">
              Ep {blog.number}
            </span>
          )}
          <p className="text-[12.5px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>{blog.title}</p>
        </div>
        {blog.slug && (
          <p className="mt-0.5 text-[11px] text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>/{blog.slug}</p>
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

export function FeaturedEmployeeCard({ employee, onClear }: { employee: EmployeeOption; onClear: () => void }) {
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

export function FeaturedHorseCard({ horse, onClear }: { horse: HorseOption; onClear: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      {horse.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={horse.image_url}
          alt={horse.name}
          className="w-14 h-14 rounded-full object-cover border border-black/10 shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-warm-bg/60 border border-black/10 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>{horse.name}</p>
        {horse.works_in && (
          <p className="text-[11px] text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>{horse.works_in}</p>
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

export function FeaturedPageCard({ page, onClear }: { page: SitePage; onClear: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <span
        className="shrink-0 w-14 h-14 rounded-md bg-warm-bg border border-black/10 flex flex-col items-center justify-center text-foreground/55"
        aria-hidden="true"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Page</span>
        <span className="mt-0.5 text-[9px] tracking-wider text-foreground/45">→</span>
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.14em] bg-primary/15 text-primary ring-1 ring-primary/25">
            {page.group}
          </span>
          <p className="text-[12.5px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>{page.title}</p>
        </div>
        <p className="mt-0.5 text-[11px] text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>{page.path}</p>
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
