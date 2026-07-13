'use client';

import { useEffect, useRef } from 'react';

// Decorative autoplay loop that behaves on constrained devices:
//   - ships a poster so data-saver / Low Power Mode phones (which
//     refuse autoplay) show a real still instead of a black box
//   - starts playback from an effect rather than the autoplay
//     attribute, so the prefers-reduced-motion check runs first and
//     no-JS visitors simply keep the poster.
export default function AmbientVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) el.play().catch(() => {});
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      className={className}
    />
  );
}
