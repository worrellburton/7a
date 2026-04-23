'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReviewBubbleData } from '@/components/ReviewBubble';

interface Props {
  review: ReviewBubbleData | null;
  rating: number;
  total: number;
  videoUrl: string;
}

/**
 * Phase 8 — Equine-specific review card on a looping horsesRail video.
 * The quote is mounted on a glass card floating over the video; the
 * aggregate rating line sits below so the claim is anchored to the
 * real score. When no equine-keyword review exists, the card is
 * replaced by the generic rating row alone — we never invent a quote.
 */
export default function EquineReviewClient({ review, rating, total, videoUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.play().catch(() => {});
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden"
      aria-labelledby="equine-review-heading"
    >
      <div className="relative min-h-[560px] lg:min-h-[640px]">
        <video
          ref={videoRef}
          src={videoUrl}
          poster="/images/equine-therapy-portrait.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(12,6,4,0.65) 0%, rgba(12,6,4,0.45) 40%, rgba(12,6,4,0.85) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 45% 60% at 20% 60%, rgba(216,137,102,0.22) 0%, rgba(216,137,102,0) 70%)',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div
              className="lg:col-span-5 text-white"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s',
              }}
            >
              <p
                className="flex items-center gap-3 text-[11px] tracking-[0.24em] uppercase font-semibold mb-5"
                style={{
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-accent)',
                }}
              >
                <span aria-hidden="true" className="block w-10 h-px" style={{ background: 'var(--color-accent)' }} />
                What alumni say about the herd
              </p>
              <h2
                id="equine-review-heading"
                className="font-bold tracking-tight mb-6"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                  lineHeight: 1.02,
                }}
              >
                A 1,200-pound lie detector,{' '}
                <em className="not-italic" style={{ color: 'var(--color-accent)' }}>and a friend</em>.
              </h2>
              <div
                className="flex items-center gap-4 text-sm text-white/80"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <GoogleRatingCluster rating={rating} total={total} />
              </div>
            </div>

            <div
              className="lg:col-span-7"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.28s',
              }}
            >
              {review ? (
                <FeaturedReviewCard review={review} />
              ) : (
                <div
                  className="rounded-3xl p-8 lg:p-10 text-white/85 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <p className="text-[15.5px] leading-relaxed">
                    Reviews load directly from Google. We don&rsquo;t feature
                    a quote here unless an actual alum wrote about the horses
                    — no invented testimonials.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GoogleRatingCluster({ rating, total }: { rating: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      <span className="font-bold text-white text-lg" style={{ fontFamily: 'var(--font-sans)' }}>
        {rating.toFixed(1)}
      </span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-white/20'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-white/60 text-xs">
        · {total.toLocaleString('en-US')} Google review{total === 1 ? '' : 's'}
      </span>
    </div>
  );
}

function FeaturedReviewCard({ review }: { review: ReviewBubbleData }) {
  const [expanded, setExpanded] = useState(false);
  const SHORT = 360;
  const isLong = review.text.length > SHORT;
  const initial = (review.name || '•').trim().charAt(0);
  const body =
    expanded || !isLong
      ? review.text
      : `${review.text.slice(0, SHORT).replace(/\s+\S*$/, '')}…`;

  return (
    <article
      className="relative rounded-3xl p-8 lg:p-10 text-white"
      aria-label={`Review by ${review.name}`}
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.14)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0 30px 80px -40px rgba(0,0,0,0.7)',
      }}
    >
      <svg
        className="w-9 h-9 mb-4"
        style={{ color: 'var(--color-accent)', opacity: 0.8 }}
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
      </svg>

      <p
        className="text-white text-lg lg:text-xl leading-relaxed"
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 400,
        }}
      >
        {body}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 text-xs font-semibold underline decoration-white/30 hover:decoration-white/70 transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {expanded ? 'Show less' : 'Read full review'}
        </button>
      )}

      <div className="mt-7 pt-6 border-t border-white/15 flex items-center gap-4">
        {review.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.photoUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-full object-cover border border-white/20"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
            aria-hidden="true"
            style={{ background: 'var(--color-primary)' }}
          >
            {initial}
          </div>
        )}
        <div className="flex-1">
          <p
            className="font-semibold text-white"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {review.name}
          </p>
          <p
            className="text-white/55 text-xs tracking-[0.1em] uppercase"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Verified Google review · {review.date}
          </p>
        </div>
        <div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400' : 'text-white/25'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </div>
    </article>
  );
}
