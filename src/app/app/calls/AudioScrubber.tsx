'use client';

import { fmtAudioTime } from './_shared';

export function AudioScrubber({ currentTime, duration, onSeek }: { currentTime: number; duration: number; onSeek: (t: number) => void }) {
  const safeDuration = duration > 0 && Number.isFinite(duration) ? duration : 0;
  const pct = safeDuration > 0 ? Math.min(100, (currentTime / safeDuration) * 100) : 0;
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (safeDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * safeDuration);
  };
  return (
    <div className="flex items-center gap-2 select-none">
      <span className="text-[10px] font-mono text-foreground/50 w-9 text-right tabular-nums">{fmtAudioTime(currentTime)}</span>
      <div
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={safeDuration}
        aria-valuenow={currentTime}
        onClick={onClick}
        className="flex-1 h-1.5 rounded-full bg-warm-bg cursor-pointer relative overflow-hidden"
      >
        <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-[width] duration-150" style={{ width: `${pct}%` }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-white shadow"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
      <span className="text-[10px] font-mono text-foreground/40 w-9 tabular-nums">{safeDuration > 0 ? fmtAudioTime(safeDuration) : '--:--'}</span>
    </div>
  );
}
