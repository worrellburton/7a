'use client';

import React, { useEffect, useRef, type ReactElement } from 'react';
import type { Layout, LayoutBlock } from '@/lib/content-claude';

// Public-site renderer for DB-backed blog posts. Walks the layout
// array produced by buildBlogLayout (phase 8) and emits each block.
//
// Block-type coverage:
//   hero               — landing image + title
//   prose              — markdown text rendered with a small inline
//                        parser (no external dependency; covers
//                        headings, paragraphs, lists, links, bold/em)
//   image              — full-bleed inline image with optional caption
//   pull_quote         — emphasised quote with attribution
//   svg_icon           — one of 6 hand-drawn inline SVGs + heading/body
//   webgl_animation    — Three.js-free canvas animation, one of 3 scenes
//   callout            — info / note / warning banner

// Blog images are stored as full-size PNGs in Supabase Storage (often
// 1–2 MB each — the AI generators emit big PNGs). Supabase's image-
// transformation endpoint resizes + re-encodes them on the fly and
// content-negotiates WebP/AVIF from the browser's Accept header, turning
// a ~1.4 MB hero PNG into ~25 KB. We rewrite the public object URL to the
// render/image URL at display time, so existing AND future posts get
// optimized with zero re-upload. Non-Supabase (or already-transformed)
// URLs pass through untouched.
const SUPABASE_PUBLIC = '/storage/v1/object/public/';
function optimizedSrc(url: string | undefined, width: number, quality = 75): string {
  if (!url || !url.includes(SUPABASE_PUBLIC)) return url ?? '';
  const base = url.replace(SUPABASE_PUBLIC, '/storage/v1/render/image/public/');
  return `${base}${base.includes('?') ? '&' : '?'}width=${width}&quality=${quality}`;
}
// Responsive srcset across the widths the ~720px (max-w-3xl) article can
// need at 1x/2x DPR. Undefined for non-Supabase URLs so <img> just uses src.
const IMG_WIDTHS = [480, 720, 1080, 1440];
function optimizedSrcSet(url: string | undefined, quality = 75): string | undefined {
  if (!url || !url.includes(SUPABASE_PUBLIC)) return undefined;
  return IMG_WIDTHS.map((w) => `${optimizedSrc(url, w, quality)} ${w}w`).join(', ');
}
const IMG_SIZES = '(max-width: 768px) 100vw, 720px';

export const ICONS: Record<string, ReactElement> = {
  compass: (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="26" />
      <path d="M32 8v6M32 50v6M8 32h6M50 32h6" />
      <path d="M40 20l-6 18-12 6 6-18z" />
    </svg>
  ),
  leaf: (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M48 8C28 8 12 22 12 42c0 8 4 14 12 14 18 0 32-14 32-32 0-6-2-12-8-16z" />
      <path d="M12 56C20 40 32 28 50 16" />
    </svg>
  ),
  mountain: (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 52l14-28 10 18 8-14 20 24z" />
      <circle cx="48" cy="14" r="4" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="12" />
      <path d="M32 4v8M32 52v8M4 32h8M52 32h8M11 11l6 6M47 47l6 6M11 53l6-6M47 17l6-6" />
    </svg>
  ),
  wave: (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 24c8-8 16-8 24 0s16 8 24 0 8-8 8 0" />
      <path d="M4 40c8-8 16-8 24 0s16 8 24 0 8-8 8 0" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 32h44M36 16l16 16-16 16" />
    </svg>
  ),
};

function inlineMarkdown(text: string): ReactElement[] {
  // Minimal inline parser: **bold**, *em*, [text](url), `code`.
  const out: (string | ReactElement)[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const bold = remaining.match(/\*\*(.+?)\*\*/);
    const em = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/);
    const link = remaining.match(/\[([^\]]+?)\]\(([^)]+?)\)/);
    const code = remaining.match(/`([^`]+?)`/);
    const candidates = [bold, em, link, code].filter((m): m is RegExpMatchArray => m !== null);
    if (candidates.length === 0) { out.push(remaining); break; }
    const next = candidates.reduce((a, b) => (a.index! < b.index! ? a : b));
    if (next.index! > 0) out.push(remaining.slice(0, next.index));
    if (next === bold) out.push(<strong key={`m${key++}`}>{next[1]}</strong>);
    else if (next === em) out.push(<em key={`m${key++}`}>{next[1]}</em>);
    else if (next === link) out.push(<a key={`m${key++}`} href={next[2]} className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary">{next[1]}</a>);
    else if (next === code) out.push(<code key={`m${key++}`} className="rounded bg-foreground/[0.06] px-1.5 py-0.5 text-[0.92em] font-mono">{next[1]}</code>);
    remaining = remaining.slice(next.index! + next[0].length);
  }
  return out.map((node, i) => typeof node === 'string' ? <span key={i}>{node}</span> : node);
}

function ProseMarkdown({ md }: { md: string }) {
  // Block-level parser. Lines are grouped into headings / lists /
  // paragraphs and rendered with a typography preset.
  const lines = md.split(/\r?\n/);
  const blocks: ReactElement[] = [];
  let i = 0;
  let key = 0;
  // GitHub-flavoured table support: a row of `| a | b |` immediately
  // followed by a separator row `| --- | --- |`. Pasted "own content"
  // often includes these (e.g. a program-length comparison); without
  // this the pipes spilled inline as plain text.
  const isTableSep = (s: string) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(s);
  const isTableStart = (idx: number) =>
    idx + 1 < lines.length && lines[idx].includes('|') && lines[idx].trim() !== '' && isTableSep(lines[idx + 1]);
  const splitRow = (s: string) => {
    let t = s.trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|')) t = t.slice(0, -1);
    return t.split('|').map((c) => c.trim());
  };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    const h1 = line.match(/^#\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    if (h1) { blocks.push(<h1 key={key++} className="font-display text-3xl sm:text-4xl font-bold text-foreground mt-10 mb-4 leading-tight">{inlineMarkdown(h1[1])}</h1>); i += 1; continue; }
    if (h2) { blocks.push(<h2 key={key++} className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-10 mb-3 leading-tight">{inlineMarkdown(h2[1])}</h2>); i += 1; continue; }
    if (h3) { blocks.push(<h3 key={key++} className="text-xl font-bold text-foreground mt-8 mb-2">{inlineMarkdown(h3[1])}</h3>); i += 1; continue; }
    if (isTableStart(i)) {
      const headers = splitRow(line);
      i += 2; // consume the header + separator rows
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push(
        <div key={key++} className="my-6 overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px] sm:text-[14px] leading-snug">
            <thead>
              <tr>
                {headers.map((h, ci) => (
                  <th key={ci} className="border-b-2 border-foreground/20 py-2 pr-4 text-left font-semibold text-foreground align-top">{inlineMarkdown(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {headers.map((_, ci) => (
                    <td key={ci} className="border-b border-foreground/10 py-2 pr-4 text-foreground/85 align-top">{inlineMarkdown(r[ci] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s+/, '')); i += 1; }
      blocks.push(
        <ul key={key++} className="list-disc pl-6 space-y-1.5 my-4 text-foreground/85 leading-relaxed">
          {items.map((it, idx) => <li key={idx}>{inlineMarkdown(it)}</li>)}
        </ul>,
      );
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s+/, '')); i += 1; }
      blocks.push(
        <ol key={key++} className="list-decimal pl-6 space-y-1.5 my-4 text-foreground/85 leading-relaxed">
          {items.map((it, idx) => <li key={idx}>{inlineMarkdown(it)}</li>)}
        </ol>,
      );
      continue;
    }
    // Paragraph — gather lines until blank or block boundary.
    const paragraph: string[] = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !/^(#|[-*]|\d+\.)\s/.test(lines[i]) && !isTableStart(i)) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push(<p key={key++} className="my-4 text-foreground/85 leading-relaxed text-[15px] sm:text-base">{inlineMarkdown(paragraph.join(' '))}</p>);
  }
  return <div>{blocks}</div>;
}

export function WebglScene({ scene, accent }: { scene: 'particles' | 'orbit' | 'aurora'; accent: string }) {
  // Canvas-based animation (no Three.js dep). Three scene templates,
  // parameterized by accent colour. Pauses when off-screen via
  // IntersectionObserver to keep the public page light on battery.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    const N = 90;
    const particles = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0008,
      vy: (Math.random() - 0.5) * 0.0008,
      r: 0.4 + Math.random() * 1.6,
    }));

    let t = 0;
    function step() {
      if (!running || !canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      t += 0.008;
      if (scene === 'aurora') {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, `${accent}11`);
        grad.addColorStop(0.5, `${accent}33`);
        grad.addColorStop(1, `${accent}11`);
        ctx.fillStyle = grad;
        for (let band = 0; band < 4; band += 1) {
          ctx.beginPath();
          const y0 = (H / 4) * band + Math.sin(t + band) * H * 0.05;
          ctx.moveTo(0, y0);
          for (let x = 0; x <= W; x += W / 32) {
            const y = y0 + Math.sin(t * 1.3 + band + x * 0.005) * H * 0.06;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(W, y0 + H * 0.18);
          ctx.lineTo(0, y0 + H * 0.18);
          ctx.closePath();
          ctx.fill();
        }
      } else if (scene === 'orbit') {
        const cx = W / 2;
        const cy = H / 2;
        for (let i = 0; i < 5; i += 1) {
          const r = (Math.min(W, H) / 2.4) * ((i + 1) / 6);
          ctx.beginPath();
          ctx.strokeStyle = `${accent}55`;
          ctx.lineWidth = dpr;
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          const a = t * (i + 1) * 0.3;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          ctx.beginPath();
          ctx.fillStyle = accent;
          ctx.arc(x, y, 4 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // particles
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > 1) p.vx *= -1;
          if (p.y < 0 || p.y > 1) p.vy *= -1;
          ctx.beginPath();
          ctx.fillStyle = `${accent}cc`;
          ctx.arc(p.x * W, p.y * H, p.r * dpr * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        // soft connecting lines between close particles
        ctx.strokeStyle = `${accent}33`;
        ctx.lineWidth = dpr;
        for (let i = 0; i < particles.length; i += 1) {
          for (let j = i + 1; j < particles.length; j += 1) {
            const dx = (particles[i].x - particles[j].x) * W;
            const dy = (particles[i].y - particles[j].y) * H;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < W * 0.15) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x * W, particles[i].y * H);
              ctx.lineTo(particles[j].x * W, particles[j].y * H);
              ctx.stroke();
            }
          }
        }
      }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        running = e.isIntersecting;
        if (running && !raf) raf = requestAnimationFrame(step);
      }
    });
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      io.disconnect();
    };
  }, [scene, accent]);
  return (
    <div className="relative my-10 rounded-2xl overflow-hidden border border-black/5 bg-warm-bg/40">
      <canvas ref={canvasRef} className="block w-full h-[280px] sm:h-[360px]" aria-hidden />
    </div>
  );
}

export default function DbBlogRenderer({
  layout,
  byline,
  suppressHero = false,
  frame = 'standalone',
}: {
  layout: Layout;
  /** Optional byline block — when provided, it renders directly
   *  after the post's hero (image + title + tagline) so the
   *  reader sees: hero → byline → content. Layouts without a
   *  hero render the byline at the very top of the article so
   *  the author still surfaces above the prose. */
  byline?: React.ReactNode;
  /** Drop the layout's hero block(s). Used when the page renders its
   *  own PageHero above the article (the site's article convention),
   *  which would otherwise duplicate the title + hero image. The
   *  byline then renders at the very top of the article body. */
  suppressHero?: boolean;
  /** 'standalone' (default) keeps the original self-contained ~720px
   *  column. 'site-article' matches the hand-coded root articles'
   *  shell exactly — max-w-[900px], same padding, white background —
   *  so DB posts are structurally identical to the static ones. */
  frame?: 'standalone' | 'site-article';
}) {
  const blocks = suppressHero ? layout.blocks.filter((b) => b.type !== 'hero') : layout.blocks;
  // Locate the hero so we can splice the byline in right after.
  // A post can in principle carry multiple hero blocks; we only
  // inject the byline after the first one, then render the rest
  // of the layout untouched.
  const heroIdx = byline ? blocks.findIndex((b) => b.type === 'hero') : -1;
  const frameCx = frame === 'site-article'
    ? 'max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 lg:pt-24 pb-4 bg-white'
    : 'max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16';
  return (
    <article className={frameCx} style={{ fontFamily: 'var(--font-body)' }}>
      {byline && heroIdx === -1 && <div className="mb-6">{byline}</div>}
      {blocks.map((block, i) => (
        <React.Fragment key={i}>
          <RenderBlock block={block} />
          {byline && i === heroIdx && <div className="-mt-4 mb-8">{byline}</div>}
        </React.Fragment>
      ))}
    </article>
  );
}

function RenderBlock({ block }: { block: LayoutBlock }) {
  switch (block.type) {
    case 'hero':
      return (
        <header className="mb-10">
          {block.image && (
            // Width/height hints reserve layout space before the
            // image meta lands, killing CLS. Hero loads eagerly
            // (above the fold) and decodes async so the browser
            // doesn't block first paint on it. Tailwind's
            // aspect-[16/9] still owns the actual render size.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={optimizedSrc(block.image.url, 1080)}
              srcSet={optimizedSrcSet(block.image.url)}
              sizes={IMG_SIZES}
              alt={block.image.alt}
              width={1600}
              height={900}
              decoding="async"
              className="w-full aspect-[16/9] object-cover rounded-2xl mb-6"
            />
          )}
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-foreground leading-tight">{block.title}</h1>
          {block.tagline && (
            <p className="mt-3 text-sm text-foreground/65 leading-relaxed">{block.tagline}</p>
          )}
        </header>
      );
    case 'prose':
      return <ProseMarkdown md={block.markdown} />;
    case 'image':
      return (
        <figure className="my-10">
          {/* Inline images load lazily — they sit below the fold
              by definition (the hero is its own block), so deferring
              them off the critical path is a free win. Same width/
              height reserved-space trick to suppress CLS as the
              article scrolls. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={optimizedSrc(block.url, 1080)}
            srcSet={optimizedSrcSet(block.url)}
            sizes={IMG_SIZES}
            alt={block.alt}
            width={1200}
            height={800}
            loading="lazy"
            decoding="async"
            className="w-full rounded-2xl object-cover"
          />
          {block.caption && (
            <figcaption className="mt-2 text-center text-[12.5px] text-foreground/55 italic">{block.caption}</figcaption>
          )}
        </figure>
      );
    case 'pull_quote':
      return (
        <blockquote className="my-12 border-l-4 border-primary pl-5 sm:pl-6 italic">
          <p className="text-xl sm:text-2xl font-display text-foreground/90 leading-snug">&ldquo;{block.quote}&rdquo;</p>
          {block.attribution && (
            <footer className="mt-3 text-[12px] uppercase tracking-[0.18em] text-foreground/45 not-italic">{block.attribution}</footer>
          )}
        </blockquote>
      );
    case 'svg_icon':
      return (
        <section className="my-10 flex gap-4 items-start">
          <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 text-primary">{ICONS[block.icon] ?? ICONS.compass}</div>
          <div className="min-w-0">
            {block.heading && <h3 className="text-lg font-bold text-foreground mb-1">{block.heading}</h3>}
            {block.body && <p className="text-foreground/75 leading-relaxed text-[15px]">{block.body}</p>}
          </div>
        </section>
      );
    case 'webgl_animation':
      return <WebglScene scene={block.scene} accent={block.accent || '#b56b46'} />;
    case 'callout':
      const tone = block.tone;
      const toneCx =
        tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' :
        tone === 'info' ? 'border-sky-200 bg-sky-50 text-sky-900' :
        'border-emerald-200 bg-emerald-50 text-emerald-900';
      return (
        <aside className={`my-10 rounded-2xl border px-5 py-4 ${toneCx}`}>
          <p className="font-bold mb-1">{block.heading}</p>
          <p className="text-[14px] leading-relaxed">{block.body}</p>
        </aside>
      );
    default:
      return null;
  }
}
