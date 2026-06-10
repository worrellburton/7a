'use client';

// Radio · /feather/radio. A staff-facing station: every signed-in user
// can tune in and play through the playlist; super admins curate it by
// uploading MP3s (and removing tracks). Files live in the public
// `radio` storage bucket and stream straight into an <audio> tag —
// no API route in the path. Writes (storage + radio_songs rows) are
// gated to super admins by RLS, so the upload UI hiding behind
// `isSuperAdmin` is cosmetic, not the security boundary.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { useModal } from '@/lib/ModalProvider';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

interface RadioSong {
  id: string;
  title: string;
  artist: string | null;
  filename: string;
  storage_path: string;
  public_url: string;
  duration_seconds: number | null;
  size_bytes: number | null;
  created_by: string | null;
  created_at: string;
}

interface UploadingTrack {
  key: string;
  name: string;
  status: 'uploading' | 'error';
  error?: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '–:––';
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// "highway-to-heaven_final-mix.mp3" → "highway to heaven final mix"
function titleFromFilename(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || name
  );
}

// Read a track's duration in the browser before upload so the playlist
// can show lengths without a server-side probe. Returns null when the
// browser can't decode the file — the row just shows –:––.
function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.onloadedmetadata = () =>
      done(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
}

export default function RadioContent() {
  const { user, isSuperAdmin } = useAuth();
  const { confirm, alert } = useModal();

  const [songs, setSongs] = useState<RadioSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadingTrack[]>([]);

  // Player state. `currentId` (not an index) so the current track
  // survives playlist mutations (a delete or upload mid-listen).
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [progress, setProgress] = useState(0); // seconds into current track
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const current = useMemo(
    () => songs.find((s) => s.id === currentId) || null,
    [songs, currentId],
  );

  const loadSongs = useCallback(async () => {
    const { data, error } = await supabase
      .from('radio_songs')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && Array.isArray(data)) {
      setSongs(data as RadioSong[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  // ----- Playback -----

  const playSong = useCallback((song: RadioSong) => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentId(song.id);
    setProgress(0);
    if (audio.src !== song.public_url) {
      audio.src = song.public_url;
    }
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (current) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    } else if (songs.length > 0) {
      // Nothing cued yet — start the station from the top (or anywhere
      // when shuffling).
      const first = shuffle
        ? songs[Math.floor(Math.random() * songs.length)]
        : songs[0];
      playSong(first);
    }
  }, [playing, current, songs, shuffle, playSong]);

  // Pick what spins next. Shuffle avoids repeating the current track
  // (unless it's the only one); linear wraps around like a real
  // station — the playlist loops forever.
  const nextSong = useCallback(
    (direction: 1 | -1 = 1): RadioSong | null => {
      if (songs.length === 0) return null;
      if (shuffle && songs.length > 1) {
        const others = songs.filter((s) => s.id !== currentId);
        return others[Math.floor(Math.random() * others.length)];
      }
      const idx = songs.findIndex((s) => s.id === currentId);
      if (idx === -1) return songs[0];
      return songs[(idx + direction + songs.length) % songs.length];
    },
    [songs, shuffle, currentId],
  );

  const skip = useCallback(
    (direction: 1 | -1) => {
      const next = nextSong(direction);
      if (next) playSong(next);
    },
    [nextSong, playSong],
  );

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const duration = current?.duration_seconds || audio?.duration;
      if (!audio || !duration || !Number.isFinite(duration)) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * duration;
      setProgress(audio.currentTime);
    },
    [current],
  );

  // ----- Super-admin curation -----

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!user?.id) return;
      const list = Array.from(files).filter(
        (f) => f.type === 'audio/mpeg' || f.type === 'audio/mp3' || /\.mp3$/i.test(f.name),
      );
      if (list.length === 0) {
        await alert('Only MP3 files can go on the radio.');
        return;
      }
      for (const file of list) {
        const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setUploads((prev) => [...prev, { key, name: file.name, status: 'uploading' }]);
        try {
          const duration = await readAudioDuration(file);
          const path = `${user.id}/${key}.mp3`;
          const { error: storageError } = await supabase.storage
            .from('radio')
            .upload(path, file, {
              contentType: 'audio/mpeg',
              cacheControl: '3600',
              upsert: false,
            });
          if (storageError) throw new Error(storageError.message);

          const { data: urlData } = supabase.storage.from('radio').getPublicUrl(path);
          const publicUrl = urlData?.publicUrl;
          if (!publicUrl) throw new Error('No public URL returned from storage.');

          const { error: insertError } = await supabase.from('radio_songs').insert({
            title: titleFromFilename(file.name),
            filename: file.name,
            storage_path: path,
            public_url: publicUrl,
            duration_seconds: duration,
            size_bytes: file.size,
            created_by: user.id,
          });
          if (insertError) throw new Error(insertError.message);

          logActivity({
            userId: user.id,
            type: 'doc.uploaded',
            targetKind: 'file',
            targetLabel: file.name,
            metadata: { bucket: 'radio', size: file.size, mime: 'audio/mpeg', url: publicUrl },
          });

          setUploads((prev) => prev.filter((u) => u.key !== key));
        } catch (err) {
          setUploads((prev) =>
            prev.map((u) =>
              u.key === key ? { ...u, status: 'error', error: String(err instanceof Error ? err.message : err) } : u,
            ),
          );
        }
      }
      await loadSongs();
    },
    [user?.id, alert, loadSongs],
  );

  const deleteSong = useCallback(
    async (song: RadioSong) => {
      const ok = await confirm(`Take “${song.title}” off the radio?`, {
        message: 'The MP3 is deleted from storage too. This can’t be undone.',
        tone: 'danger',
      });
      if (!ok) return;
      if (song.id === currentId) {
        audioRef.current?.pause();
        setPlaying(false);
        setCurrentId(null);
      }
      // Row first (it's the gate users see), file second; an orphaned
      // file in the bucket is harmless, an orphaned row is a dead track.
      const { error } = await supabase.from('radio_songs').delete().eq('id', song.id);
      if (error) {
        await alert('Could not delete the track.', { message: error.message });
        return;
      }
      await supabase.storage.from('radio').remove([song.storage_path]);
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
    },
    [confirm, alert, currentId],
  );

  const duration = current?.duration_seconds || audioRef.current?.duration || 0;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-8 lg:mb-10">
          <p className="text-[10px] uppercase tracking-[0.28em] text-primary font-bold mb-3">
            Seven Arrows
          </p>
          <h1
            className="text-3xl lg:text-5xl font-bold text-foreground leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Radio
          </h1>
          <p className="mt-4 text-base text-foreground/65 max-w-2xl leading-relaxed">
            The house station. Hit play and it spins through every track on the
            playlist{isSuperAdmin ? ' — drop MP3s below to add to the rotation.' : '.'}
          </p>
        </header>

        {/* Hidden audio element — the actual radio. */}
        <audio
          ref={audioRef}
          onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
          onEnded={() => skip(1)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />

        {/* Now playing */}
        <section className="rounded-2xl bg-white border border-primary/30 shadow-sm px-6 py-6 mb-8">
          <div className="flex items-center gap-5">
            {/* Play / pause */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={songs.length === 0}
              aria-label={playing ? 'Pause' : 'Play'}
              className="w-14 h-14 shrink-0 rounded-full bg-primary text-white flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {playing ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg className="w-6 h-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5.5v13a1 1 0 0 0 1.52.86l10.2-6.5a1 1 0 0 0 0-1.7L9.52 4.63A1 1 0 0 0 8 5.5z" />
                </svg>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold mb-1">
                {playing ? 'Now playing' : current ? 'Paused' : 'On air'}
              </p>
              <p
                className="text-lg font-bold text-foreground truncate"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {current ? current.title : songs.length > 0 ? 'Press play to tune in' : 'Nothing on the playlist yet'}
              </p>
              {current?.artist && (
                <p className="text-sm text-foreground/60 truncate">{current.artist}</p>
              )}
            </div>

            {/* Prev / next / shuffle */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => skip(-1)}
                disabled={songs.length === 0}
                aria-label="Previous track"
                className="w-9 h-9 rounded-full flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-40"
              >
                <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 6a1 1 0 0 1 2 0v5l8.5-5.4A1 1 0 0 1 19 6.4v11.2a1 1 0 0 1-1.5.8L9 13v5a1 1 0 0 1-2 0V6z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => skip(1)}
                disabled={songs.length === 0}
                aria-label="Next track"
                className="w-9 h-9 rounded-full flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-40"
              >
                <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 6a1 1 0 0 0-2 0v5L6.5 5.6A1 1 0 0 0 5 6.4v11.2a1 1 0 0 0 1.5.8L15 13v5a1 1 0 0 0 2 0V6z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShuffle((s) => !s)}
                aria-label="Toggle shuffle"
                aria-pressed={shuffle}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  shuffle
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 3h5v5" />
                  <path d="M4 20 21 3" />
                  <path d="M21 16v5h-5" />
                  <path d="m15 15 6 6" />
                  <path d="m4 4 5 5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5 flex items-center gap-3 text-[11px] tabular-nums text-foreground/50">
            <span className="w-9 text-right">{formatDuration(progress)}</span>
            <div
              className="relative flex-1 h-5 flex items-center cursor-pointer group"
              onClick={seek}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration || 0)}
              aria-valuenow={Math.round(progress)}
            >
              <div className="w-full h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-[width] duration-150"
                  style={{ width: duration ? `${Math.min(100, (progress / duration) * 100)}%` : '0%' }}
                />
              </div>
            </div>
            <span className="w-9">{formatDuration(current?.duration_seconds ?? null)}</span>
          </div>
        </section>

        {/* Upload — super admins only. RLS enforces the same gate
            server-side, so this is just keeping the UI honest. */}
        {isSuperAdmin && (
          <section className="mb-8">
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,audio/mpeg"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
              }}
              className="w-full rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors px-6 py-8 text-center"
            >
              <svg className="w-7 h-7 mx-auto mb-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <p className="text-sm font-semibold text-foreground">
                Drop MP3s here or click to upload
              </p>
              <p className="mt-1 text-xs text-foreground/55">
                Tracks go straight into the rotation. 50 MB max per file.
              </p>
            </button>

            {uploads.length > 0 && (
              <ul className="mt-3 space-y-2">
                {uploads.map((u) => (
                  <li
                    key={u.key}
                    className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm ${
                      u.status === 'error'
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : 'bg-foreground/5 text-foreground/70'
                    }`}
                  >
                    {u.status === 'uploading' && (
                      <span className="w-3.5 h-3.5 shrink-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    )}
                    <span className="truncate flex-1">{u.name}</span>
                    {u.status === 'error' ? (
                      <span className="text-xs truncate max-w-[50%]">{u.error}</span>
                    ) : (
                      <span className="text-xs">Uploading…</span>
                    )}
                    {u.status === 'error' && (
                      <button
                        type="button"
                        onClick={() => setUploads((prev) => prev.filter((x) => x.key !== u.key))}
                        className="text-xs underline shrink-0"
                      >
                        Dismiss
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Playlist */}
        <section>
          <h2
            className="text-xl font-bold text-foreground mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Playlist
            {songs.length > 0 && (
              <span className="ml-2 text-sm font-normal text-foreground/45 tabular-nums">
                {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
              </span>
            )}
          </h2>

          {loading ? (
            <p className="text-sm text-foreground/50 py-8 text-center">Tuning in…</p>
          ) : songs.length === 0 ? (
            <p className="text-sm text-foreground/50 py-8 text-center rounded-2xl border border-foreground/10">
              {isSuperAdmin
                ? 'No tracks yet — upload the first MP3 above to get the station on air.'
                : 'No tracks yet. A super admin needs to load up the playlist.'}
            </p>
          ) : (
            <ul className="divide-y divide-foreground/8 rounded-2xl border border-foreground/10 bg-white overflow-hidden">
              {songs.map((song, i) => {
                const isCurrent = song.id === currentId;
                return (
                  <li
                    key={song.id}
                    className={`group flex items-center gap-4 px-4 sm:px-5 py-3 cursor-pointer transition-colors ${
                      isCurrent ? 'bg-primary/5' : 'hover:bg-foreground/3'
                    }`}
                    onClick={() => (isCurrent ? togglePlay() : playSong(song))}
                  >
                    <span className="w-6 shrink-0 text-center">
                      {isCurrent && playing ? (
                        // Tiny equalizer for the live track.
                        <span className="inline-flex items-end gap-[2px] h-3.5" aria-label="Playing">
                          <span className="w-[3px] bg-primary rounded-sm animate-pulse" style={{ height: '60%' }} />
                          <span className="w-[3px] bg-primary rounded-sm animate-pulse" style={{ height: '100%', animationDelay: '150ms' }} />
                          <span className="w-[3px] bg-primary rounded-sm animate-pulse" style={{ height: '40%', animationDelay: '300ms' }} />
                        </span>
                      ) : (
                        <span className="text-[12px] tabular-nums text-foreground/35">{i + 1}</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${isCurrent ? 'font-semibold text-primary' : 'font-medium text-foreground/85'}`}>
                        {song.title}
                      </p>
                      {song.artist && (
                        <p className="text-xs text-foreground/50 truncate">{song.artist}</p>
                      )}
                    </div>
                    <span className="text-[12px] tabular-nums text-foreground/45 shrink-0">
                      {formatDuration(song.duration_seconds)}
                    </span>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSong(song);
                        }}
                        aria-label={`Delete ${song.title}`}
                        className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-foreground/30 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
