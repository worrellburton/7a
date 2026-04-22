'use client';

import { useState } from 'react';

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <svg className="w-4 h-4 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
      <path d="M12 2l2.4 2.8 3.6-.4.4 3.6L21 10.4 18.4 12l2.4 2.4-3 2.4.4 3.6-3.6-.4L12 22l-2.4-2.8-3.6.4-.4-3.6L3 13.6 5.6 12 3.2 9.6l3-2.4-.4-3.6 3.6.4L12 2z" />
      <path d="M10.5 13.5l-2-2-1 1 3 3 5.5-5.5-1-1z" fill="#fff" />
    </svg>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return cut.slice(0, lastSpace > 80 ? lastSpace : cut.length);
}

export interface ReviewBubbleData {
  name: string;
  date: string;
  rating: number;
  text: string;
  photoUrl?: string | null;
}

export function ReviewBubble({ review }: { review: ReviewBubbleData }) {
  const [expanded, setExpanded] = useState(false);
  const SHORT_LEN = 140;
  const isLong = review.text.length > SHORT_LEN;
  const initial = review.name.trim().charAt(0);

  return (
    <div className="flex flex-col">
      <div className="relative bg-warm-card rounded-2xl p-5 text-left" style={{ fontFamily: 'var(--font-body)' }}>
        <ReviewStars rating={review.rating} />
        <p className="mt-3 text-foreground text-sm leading-relaxed">
          {expanded || !isLong ? review.text : `${truncate(review.text, SHORT_LEN)}…`}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-xs text-foreground/40 hover:text-primary transition-colors"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        <div className="absolute -bottom-2 left-8 w-4 h-4 bg-warm-card rotate-45" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-3 mt-5 pl-2">
        <div className="relative">
          {review.photoUrl ? (
            // Places photo URLs are already sized thumbnails; next/image would
            // require a remotePatterns entry so plain img is simpler here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={review.photoUrl}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm"
              aria-hidden="true"
            >
              {initial}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
            <GoogleIcon className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <p className="font-semibold text-foreground text-sm">{review.name}</p>
            <VerifiedBadge />
          </div>
          <p className="text-foreground/50 text-xs">{review.date}</p>
        </div>
      </div>
    </div>
  );
}
