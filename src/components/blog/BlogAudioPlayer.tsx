'use client';

import { useEffect, useRef, useState } from 'react';

// Inline audio player rendered above each AI-pipeline blog post that
// has an `audio_url` populated by ElevenLabs (via /api/content/[id]/audio).
// Light visual chrome — same warm-bg pill the marketing pages use —
// so it sits naturally above the article without competing with the
// reading experience.

interface BlogAudioPlayerProps {
  src: string;
  title: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function BlogAudioPlayer({ src, title }: BlogAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => { setDuration(audio.duration); setLoaded(true); };
    const onTime = () => setCurrent(audio.currentTime);
    const onEnded = () => setPlaying(false);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Number(e.target.value);
    audio.currentTime = next;
    setCurrent(next);
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="not-prose mb-8 rounded-2xl border border-black/10 bg-warm-bg/50 px-5 py-4 flex items-center gap-4">
      <button
        type="button"
        onClick={toggle}
        className="shrink-0 w-11 h-11 rounded-full bg-primary text-white inline-flex items-center justify-center hover:bg-primary-dark transition-colors"
        aria-label={playing ? 'Pause article audio' : 'Play article audio'}
      >
        {playing ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 5v14l12-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] uppercase tracking-[0.18em] text-foreground/55 font-semibold mb-1"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Listen to the article
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={seek}
            disabled={!loaded}
            aria-label={`Seek through ${title}`}
            className="flex-1 h-1 appearance-none rounded-full bg-foreground/15 accent-primary cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, var(--color-primary, #a0522d) 0%, var(--color-primary, #a0522d) ${progress}%, rgba(20,10,6,0.15) ${progress}%, rgba(20,10,6,0.15) 100%)`,
            }}
          />
          <span
            className="shrink-0 text-[11px] font-mono text-foreground/55 tabular-nums"
            aria-hidden="true"
          >
            {formatTime(current)} / {loaded ? formatTime(duration) : '—:—'}
          </span>
        </div>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
