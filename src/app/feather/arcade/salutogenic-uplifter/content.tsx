'use client';

// Salutogenic Uplifter · /feather/arcade/salutogenic-uplifter
//
// Street Fighter's theater, inverted. Two REAL players (no AI — you
// have to play with somebody) face off in a 3D golden-hour arena.
// The power bars at the top start EMPTY: every turn you read the
// state your opponent's character is in and pick the response that
// actually meets them there. Attuned picks (plus speed, plus combo
// streaks) pour uplift into THEIR bar — whoever fills the other
// person's bar first wins. Nobody drains; nobody dies; somebody
// still takes the crown.
//
// Multiplayer is Supabase Realtime: a lobby presence channel for
// matchmaking (host a match → it appears for everyone browsing),
// then a per-room channel where the host broadcasts a shared seed —
// both clients derive the identical scenario sequence from it — and
// each turn's pick travels as one tiny broadcast event. Profile
// pictures ride into the 3D scene as circle-cropped head textures.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useArcadeScore } from '../_lib/useArcadeScore';
import Leaderboard from '../_components/Leaderboard';
import {
  BAR_MAX,
  MAX_TURNS,
  MOOD_COLORS,
  QUALITY_FEEDBACK,
  TURN_SECONDS,
  buildTurnSequence,
  pointsFor,
  type ChoiceQuality,
  type TurnScenario,
} from './scenarios';
import { UplifterScene } from './scene';

type Phase = 'lobby' | 'waiting' | 'match' | 'over';

interface PlayerMeta {
  id: string;
  name: string;
  avatar: string | null;
  // users.avatar_thumb — a tiny data-URL copy of the avatar. Data URLs
  // are always CORS-clean, so the 3D head texture falls back to this
  // when the full avatar's host blocks WebGL texture use.
  thumb: string | null;
}

interface LobbyEntry extends PlayerMeta {
  hosting: string | null; // room code when hosting an open match
}

interface MatchState {
  seed: number;
  players: [string, string]; // [host, guest] — host acts first
  sequence: TurnScenario[];
}

interface MovePayload {
  turn: number;
  choice: number; // index into the shuffled order; -1 = timed out
  points: number;
  quality: ChoiceQuality | null;
  byId: string;
  streak: number;
}

interface Feedback {
  key: number;
  label: string;
  blurb: string;
  points: number;
  mine: boolean;
}

function roomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Background score for the arena — looked up from the radio playlist
// by title so re-uploading a fresh mix under the same name just works.
const BG_TRACK_TITLE = 'Dustline Horizon';
const MUSIC_VOLUME_KEY = 'uplifter-music-volume';

export default function SalutogenicUplifterContent() {
  const { user } = useAuth();
  const submitScore = useArcadeScore('salutogenic_uplifter');

  const [phase, setPhase] = useState<Phase>('lobby');
  const [me, setMe] = useState<PlayerMeta | null>(null);
  const [openMatches, setOpenMatches] = useState<LobbyEntry[]>([]);
  const [opponent, setOpponent] = useState<PlayerMeta | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [turn, setTurn] = useState(0);
  const [bars, setBars] = useState<Record<string, number>>({});
  const [myStreak, setMyStreak] = useState(0);
  const [picked, setPicked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [endNote, setEndNote] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [musicMuted, setMusicMuted] = useState(false);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  const sceneHostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<UplifterScene | null>(null);
  const lobbyChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const roomChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isHostRef = useRef(false);
  const startPayloadRef = useRef<{ seed: number; hostId: string; guestId: string } | null>(null);
  const matchRef = useRef<MatchState | null>(null);
  const turnRef = useRef(0);
  const barsRef = useRef<Record<string, number>>({});
  const appliedTurnsRef = useRef<Set<number>>(new Set());
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineRef = useRef(0);
  const submittedRef = useRef(false);
  const phaseRef = useRef<Phase>('lobby');
  const opponentRef = useRef<PlayerMeta | null>(null);
  phaseRef.current = phase;
  matchRef.current = match;
  turnRef.current = turn;
  opponentRef.current = opponent;

  const myId = user?.id ?? '';
  const oppId = opponent?.id ?? '';

  // ── My profile (name + avatar ride presence + the 3D head) ──

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from('users')
      .select('full_name, avatar_url, avatar_thumb')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const fallback = (user.email || 'Player').split('@')[0].replace(/[._]/g, ' ');
        setMe({
          id: user.id,
          name: (data?.full_name as string | null) || fallback,
          avatar: (data?.avatar_url as string | null) || null,
          thumb: (data?.avatar_thumb as string | null) || null,
        });
      });
    return () => { cancelled = true; };
  }, [user?.id, user?.email]);

  // ── Background score ────────────────────────────────────────
  // Plays on a loop the whole time you're in the arena. Volume has
  // its own slider (bottom corner of the arena) and persists — some
  // people want the score, some want to hear themselves think.

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('radio_songs')
      .select('public_url')
      .ilike('title', BG_TRACK_TITLE)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.public_url) setMusicUrl(data.public_url as string);
      });
    const stored = parseFloat(localStorage.getItem(MUSIC_VOLUME_KEY) ?? '');
    if (Number.isFinite(stored) && stored >= 0 && stored <= 1) setMusicVolume(stored);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const el = bgAudioRef.current;
    if (el) el.volume = musicMuted ? 0 : musicVolume;
    localStorage.setItem(MUSIC_VOLUME_KEY, String(musicVolume));
  }, [musicVolume, musicMuted]);

  // ── Lobby presence: see who's hosting, advertise when I host ──

  const trackLobby = useCallback((hosting: string | null) => {
    const ch = lobbyChannelRef.current;
    if (!ch || !me) return;
    void ch.track({ name: me.name, avatar: me.avatar, thumb: me.thumb, hosting });
  }, [me]);

  useEffect(() => {
    if (!me) return;
    const ch = supabase.channel('uplifter-lobby', { config: { presence: { key: me.id } } });
    lobbyChannelRef.current = ch;
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ name: string; avatar: string | null; thumb: string | null; hosting: string | null }>();
      const entries: LobbyEntry[] = [];
      for (const [id, metas] of Object.entries(state)) {
        const m = metas[0];
        if (!m) continue;
        entries.push({ id, name: m.name, avatar: m.avatar, thumb: m.thumb ?? null, hosting: m.hosting ?? null });
      }
      setOpenMatches(entries.filter((e) => e.hosting && e.id !== me.id));
    });
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') void ch.track({ name: me.name, avatar: me.avatar, thumb: me.thumb, hosting: null });
    });
    return () => {
      void supabase.removeChannel(ch);
      lobbyChannelRef.current = null;
    };
  }, [me]);

  // ── 3D scene lifecycle — alive for waiting/match/over phases ──

  const inArena = phase !== 'lobby';

  // Score starts when you step into the arena, stops when you leave.
  // Entering is always click-initiated (host/challenge), so autoplay
  // policy is satisfied.
  useEffect(() => {
    const el = bgAudioRef.current;
    if (!el) return;
    if (inArena && musicUrl) {
      void el.play().catch(() => { /* autoplay blocked — slider still works */ });
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [inArena, musicUrl]);
  useEffect(() => {
    if (!inArena || !sceneHostRef.current || sceneRef.current) return;
    const scene = new UplifterScene(sceneHostRef.current);
    sceneRef.current = scene;
    const onResize = () => scene.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [inArena]);

  useEffect(() => {
    if (me && sceneRef.current && inArena) sceneRef.current.setPlayer('left', me.name, me.avatar, me.thumb);
  }, [me, inArena]);
  useEffect(() => {
    if (opponent && sceneRef.current && inArena) sceneRef.current.setPlayer('right', opponent.name, opponent.avatar, opponent.thumb);
  }, [opponent, inArena]);

  // ── Match plumbing ──────────────────────────────────────────

  const endMatch = useCallback((winner: string | null, note: string | null) => {
    if (phaseRef.current === 'over') return;
    setWinnerId(winner);
    setEndNote(note);
    setPhase('over');
    const m = matchRef.current;
    if (winner && sceneRef.current && m) {
      // The WINNER is the one who filled the other's bar — celebrate
      // the uplifted player (the loser glows; that's the whole point).
      const upliftedId = m.players[0] === winner ? m.players[1] : m.players[0];
      sceneRef.current.celebrate(upliftedId === myId ? 'left' : 'right');
      sceneRef.current.setMood('left', null);
      sceneRef.current.setMood('right', null);
    }
    // Leaderboard score = total uplift I gave (my opponent's bar).
    if (!submittedRef.current && m) {
      submittedRef.current = true;
      const given = barsRef.current[m.players[0] === myId ? m.players[1] : m.players[0]] ?? 0;
      void submitScore(given, {
        won: winner === myId,
        opponent: opponentRef.current?.name ?? 'unknown',
      }).then(() => setRefreshKey((k) => k + 1));
    }
  }, [myId, submitScore]);

  const beginTurn = useCallback((t: number) => {
    setTurn(t);
    setPicked(false);
    deadlineRef.current = Date.now() + TURN_SECONDS * 1000;
    setSecondsLeft(TURN_SECONDS);
    const m = matchRef.current;
    if (m && sceneRef.current) {
      const receiverId = m.players[(t + 1) % 2];
      const mood = m.sequence[t].scenario.mood;
      sceneRef.current.setMood(receiverId === myId ? 'left' : 'right', MOOD_COLORS[mood]);
      sceneRef.current.setMood(receiverId === myId ? 'right' : 'left', null);
    }
  }, [myId]);

  const applyMove = useCallback((mv: MovePayload) => {
    const m = matchRef.current;
    if (!m || phaseRef.current !== 'match') return;
    if (mv.turn !== turnRef.current || appliedTurnsRef.current.has(mv.turn)) return;
    appliedTurnsRef.current.add(mv.turn);

    const receiverId = m.players[0] === mv.byId ? m.players[1] : m.players[0];
    // Floor at 0 — a 'miss' subtracts uplift but can't go below empty.
    const next = Math.max(0, Math.min(BAR_MAX, (barsRef.current[receiverId] ?? 0) + mv.points));
    barsRef.current = { ...barsRef.current, [receiverId]: next };
    setBars(barsRef.current);
    if (mv.byId === myId) setMyStreak(mv.streak);

    if (mv.quality) {
      const f = QUALITY_FEEDBACK[mv.quality];
      setFeedback({ key: Date.now(), label: f.label, blurb: f.blurb, points: mv.points, mine: mv.byId === myId });
    } else {
      setFeedback({ key: Date.now(), label: 'Time!', blurb: 'The moment passed unmet.', points: 0, mine: mv.byId === myId });
    }
    if (mv.points > 0 && sceneRef.current) {
      sceneRef.current.castUplift(mv.byId === myId ? 'left' : 'right', mv.points / 30);
    }
    if (mv.points < 0 && sceneRef.current) {
      // A backfire still "lands" — small joyless thud of a cast.
      sceneRef.current.castUplift(mv.byId === myId ? 'left' : 'right', 0.1);
    }

    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      setFeedback(null);
      if (next >= BAR_MAX) {
        endMatch(mv.byId, null);
        return;
      }
      const nextTurn = mv.turn + 1;
      if (nextTurn >= MAX_TURNS) {
        const givenByHost = barsRef.current[m.players[1]] ?? 0;
        const givenByGuest = barsRef.current[m.players[0]] ?? 0;
        if (givenByHost === givenByGuest) endMatch(null, 'Dead even — you uplifted each other equally. Beautiful, honestly.');
        else endMatch(givenByHost > givenByGuest ? m.players[0] : m.players[1], 'Time! Most uplift given takes it.');
        return;
      }
      beginTurn(nextTurn);
    }, 2100);
  }, [myId, beginTurn, endMatch]);

  const initMatch = useCallback((seed: number, hostId: string, guestId: string) => {
    if (startPayloadRef.current && phaseRef.current === 'match') return;
    startPayloadRef.current = { seed, hostId, guestId };
    const m: MatchState = { seed, players: [hostId, guestId], sequence: buildTurnSequence(seed, MAX_TURNS) };
    matchRef.current = m;
    setMatch(m);
    barsRef.current = { [hostId]: 0, [guestId]: 0 };
    setBars(barsRef.current);
    appliedTurnsRef.current = new Set();
    submittedRef.current = false;
    setMyStreak(0);
    setWinnerId(null);
    setEndNote(null);
    setPhase('match');
    trackLobby(null); // match is no longer open
    beginTurn(0);
  }, [beginTurn, trackLobby]);

  const leaveRoom = useCallback(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (roomChannelRef.current) {
      void supabase.removeChannel(roomChannelRef.current);
      roomChannelRef.current = null;
    }
    startPayloadRef.current = null;
    matchRef.current = null;
    setMatch(null);
    setOpponent(null);
    setPhase('lobby');
    trackLobby(null);
  }, [trackLobby]);

  const joinRoom = useCallback((code: string, asHost: boolean) => {
    if (!me) return;
    isHostRef.current = asHost;
    const ch = supabase.channel(`uplifter-room-${code}`, {
      config: { presence: { key: me.id }, broadcast: { self: false } },
    });
    roomChannelRef.current = ch;

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ name: string; avatar: string | null; thumb: string | null }>();
      const others = Object.entries(state).filter(([id]) => id !== me.id);
      if (others.length > 0) {
        const [id, metas] = others[0];
        const meta = metas[0];
        if (meta) setOpponent({ id, name: meta.name, avatar: meta.avatar, thumb: meta.thumb ?? null });
        // Host kicks the match off the moment a challenger arrives.
        if (isHostRef.current && !startPayloadRef.current) {
          const payload = { seed: Math.floor(Math.random() * 2 ** 31), hostId: me.id, guestId: id };
          void ch.send({ type: 'broadcast', event: 'start', payload });
          initMatch(payload.seed, payload.hostId, payload.guestId);
        }
      }
    });
    ch.on('presence', { event: 'leave' }, ({ key }) => {
      if (key !== me.id && phaseRef.current === 'match') {
        endMatch(me.id, `${opponentRef.current?.name ?? 'Your opponent'} left the arena.`);
      }
    });
    ch.on('broadcast', { event: 'start' }, ({ payload }) => {
      const p = payload as { seed: number; hostId: string; guestId: string };
      // Two challengers raced for the same host and we lost — bow out
      // instead of spectating a match we're not in.
      if (p.hostId !== me.id && p.guestId !== me.id) {
        leaveRoom();
        return;
      }
      initMatch(p.seed, p.hostId, p.guestId);
    });
    // Belt-and-braces for the join race: a guest that subscribed after
    // the host's 'start' asks for it again.
    ch.on('broadcast', { event: 'ready' }, () => {
      if (isHostRef.current && startPayloadRef.current) {
        void ch.send({ type: 'broadcast', event: 'start', payload: startPayloadRef.current });
      }
    });
    ch.on('broadcast', { event: 'move' }, ({ payload }) => applyMove(payload as MovePayload));

    ch.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      void ch.track({ name: me.name, avatar: me.avatar, thumb: me.thumb });
      if (!asHost) void ch.send({ type: 'broadcast', event: 'ready', payload: {} });
    });
  }, [me, initMatch, applyMove, endMatch, leaveRoom]);

  const hostMatch = useCallback(() => {
    if (!me) return;
    const code = roomCode();
    setPhase('waiting');
    joinRoom(code, true);
    trackLobby(code);
  }, [me, joinRoom, trackLobby]);

  const acceptMatch = useCallback((entry: LobbyEntry) => {
    if (!entry.hosting) return;
    setOpponent({ id: entry.id, name: entry.name, avatar: entry.avatar, thumb: entry.thumb });
    setPhase('waiting');
    joinRoom(entry.hosting, false);
  }, [joinRoom]);

  // Room channel cleanup on unmount.
  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (roomChannelRef.current) void supabase.removeChannel(roomChannelRef.current);
  }, []);

  // ── Turn timer (display on both clients; the actor enforces) ──

  const actorId = match ? match.players[turn % 2] : null;
  const iAmActor = !!match && actorId === myId;

  useEffect(() => {
    if (phase !== 'match') return;
    const iv = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && iAmActor && !picked && !appliedTurnsRef.current.has(turnRef.current)) {
        setPicked(true);
        const mv: MovePayload = { turn: turnRef.current, choice: -1, points: 0, quality: null, byId: myId, streak: 0 };
        void roomChannelRef.current?.send({ type: 'broadcast', event: 'move', payload: mv });
        applyMove(mv);
      }
    }, 250);
    return () => clearInterval(iv);
  }, [phase, iAmActor, picked, myId, applyMove]);

  const pick = useCallback((displayIdx: number) => {
    const m = matchRef.current;
    if (!m || !iAmActor || picked || phaseRef.current !== 'match') return;
    setPicked(true);
    const ts = m.sequence[turnRef.current];
    const choice = ts.scenario.choices[ts.order[displayIdx]];
    const left = Math.max(0, (deadlineRef.current - Date.now()) / 1000);
    const points = pointsFor(choice.quality, left, myStreak);
    const streak = choice.quality === 'attuned' ? myStreak + 1 : 0;
    const mv: MovePayload = { turn: turnRef.current, choice: displayIdx, points, quality: choice.quality, byId: myId, streak };
    void roomChannelRef.current?.send({ type: 'broadcast', event: 'move', payload: mv });
    applyMove(mv);
  }, [iAmActor, picked, myStreak, myId, applyMove]);

  // Keyboard: 1–4 pick on your turn.
  useEffect(() => {
    if (phase !== 'match' || !iAmActor) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 4) pick(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, iAmActor, pick]);

  // ── Derived view bits ───────────────────────────────────────

  const turnScenario = match && phase !== 'lobby' ? match.sequence[Math.min(turn, MAX_TURNS - 1)] : null;
  const receiverId = match ? match.players[(turn + 1) % 2] : null;
  const iAmReceiver = receiverId === myId;
  const myBar = bars[myId] ?? 0;
  const oppBar = bars[oppId] ?? 0;

  if (!user) return null;

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Link href="/feather/arcade" className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary hover:text-primary-dark transition-colors">
            ← Arcade
          </Link>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Salutogenic Uplifter
          </h1>
          <p className="mt-1 text-sm text-foreground/65 max-w-2xl">
            Two players. Empty power bars. Read your opponent&rsquo;s state, pick the response that
            truly meets them, and fill <em>their</em> bar — whoever uplifts the other first wins.
          </p>
        </div>
      </header>

      {phase === 'lobby' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Host card */}
            <div className="rounded-3xl border border-black/10 bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                Step into the arena
              </h2>
              <p className="mt-2 text-sm text-foreground/70 max-w-lg leading-relaxed">
                This one needs a real human on the other side — host a match and it appears below for
                everyone in the lobby, or join an open one. Each turn you&rsquo;ll see the state your opponent
                is in and four things you could say. Only one is truly <strong>attuned</strong> — and one
                always <strong>backfires</strong> and drains their uplift. Fast, attuned picks (and
                3-in-a-row co-regulation combos) score the biggest uplift.
              </p>
              <button
                type="button"
                onClick={hostMatch}
                disabled={!me}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary text-white px-6 py-3 text-sm font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Host a match
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>

            {/* Open matches */}
            <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/55 mb-4">Open matches</h3>
              {openMatches.length === 0 ? (
                <p className="text-sm text-foreground/50 italic py-4 text-center">
                  Nobody&rsquo;s hosting right now — be the one waiting in the arena.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {openMatches.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-black/8 bg-amber-50/60 px-4 py-3">
                      {m.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatar} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover border border-black/10" />
                      ) : (
                        <span className="w-9 h-9 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center border border-primary/15">
                          {m.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{m.name}</p>
                        <p className="text-[11px] text-foreground/50">waiting in the arena…</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => acceptMatch(m)}
                        className="shrink-0 rounded-full bg-foreground text-white px-4 py-2 text-xs font-bold hover:opacity-85 transition-opacity"
                      >
                        Challenge
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <Leaderboard game="salutogenic_uplifter" scoreLabel="Uplift given" refreshKey={refreshKey} />
          </div>
        </div>
      )}

      {/* Background score — Dustline Horizon from the radio playlist. */}
      <audio ref={bgAudioRef} src={musicUrl ?? undefined} loop preload="none" />

      {phase !== 'lobby' && (
        <div className="relative rounded-3xl overflow-hidden border border-black/15 shadow-xl bg-[#1a1410]">
          {/* 3D arena */}
          <div ref={sceneHostRef} className="w-full aspect-[16/10] sm:aspect-[16/9] [&>canvas]:w-full [&>canvas]:h-full [&>canvas]:block" />

          {/* Music volume — bottom corner, out of the action */}
          {musicUrl && (
            <div className="absolute bottom-2.5 right-3 flex items-center gap-2 rounded-full bg-black/45 backdrop-blur px-3 py-1.5">
              <button
                type="button"
                onClick={() => setMusicMuted((m) => !m)}
                aria-label={musicMuted ? 'Unmute music' : 'Mute music'}
                aria-pressed={musicMuted}
                className="text-amber-100/85 hover:text-white transition-colors"
              >
                {musicMuted || musicVolume === 0 ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5 6 9H2v6h4l5 4V5z" />
                    <path d="m23 9-6 6M17 9l6 6" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={musicMuted ? 0 : musicVolume}
                onChange={(e) => {
                  setMusicVolume(parseFloat(e.target.value));
                  setMusicMuted(false);
                }}
                aria-label="Music volume"
                className="w-20 accent-amber-300 cursor-pointer"
              />
            </div>
          )}

          {/* HUD — power bars top, SF-style but filling toward the win */}
          <div className="absolute top-0 inset-x-0 p-3 sm:p-5 flex items-start gap-3 sm:gap-4 pointer-events-none">
            <PowerBar side="left" name={me?.name ?? 'You'} avatar={me?.avatar ?? null} value={myBar} active={receiverId === myId} />
            <div className="shrink-0 flex flex-col items-center pt-0.5">
              <span className="text-[10px] sm:text-xs font-black tracking-widest text-amber-200/90 drop-shadow">TURN</span>
              <span className="text-lg sm:text-2xl font-black text-white tabular-nums drop-shadow" style={{ fontFamily: 'var(--font-display)' }}>
                {Math.min(turn + 1, MAX_TURNS)}
              </span>
            </div>
            <PowerBar side="right" name={opponent?.name ?? '…'} avatar={opponent?.avatar ?? null} value={oppBar} active={receiverId === oppId} />
          </div>

          {/* Waiting overlay */}
          {phase === 'waiting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[2px] text-center px-6">
              <div className="w-10 h-10 rounded-full border-[3px] border-amber-200/30 border-t-amber-200 animate-spin mb-4" />
              <p className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                Waiting for a challenger…
              </p>
              <p className="mt-1 text-sm text-white/65 max-w-sm">
                Your match is listed in the lobby. The moment someone steps in, the bell rings.
              </p>
              <button
                type="button"
                onClick={leaveRoom}
                className="mt-5 pointer-events-auto rounded-full border border-white/30 text-white/85 px-5 py-2 text-xs font-bold hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Feedback splash */}
          {feedback && phase === 'match' && (
            <div key={feedback.key} className="absolute inset-x-0 top-[28%] flex flex-col items-center pointer-events-none animate-[uplift-pop_0.5s_ease-out]">
              <p
                className={`text-3xl sm:text-5xl font-black tracking-wide drop-shadow-lg ${
                  feedback.label === 'ATTUNED!'
                    ? 'text-amber-300'
                    : feedback.points > 0
                      ? 'text-orange-200'
                      : feedback.points < 0
                        ? 'text-red-400'
                        : 'text-white/70'
                }`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {feedback.label}
              </p>
              {feedback.points !== 0 && (
                <p className={`text-xl sm:text-2xl font-black drop-shadow tabular-nums ${feedback.points < 0 ? 'text-red-300' : 'text-white'}`}>
                  {feedback.points > 0 ? '+' : '−'}{Math.abs(feedback.points)} uplift
                </p>
              )}
              <p className="mt-1 text-xs sm:text-sm text-white/80 drop-shadow">{feedback.blurb}</p>
            </div>
          )}

          {/* Match-over splash */}
          {phase === 'over' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[2px] text-center px-6">
              <p className="text-5xl sm:text-7xl font-black text-amber-300 tracking-wider drop-shadow-[0_4px_24px_rgba(251,191,36,0.45)]" style={{ fontFamily: 'var(--font-display)' }}>
                UPLIFT!
              </p>
              <p className="mt-3 text-white text-lg sm:text-xl font-bold">
                {winnerId === null
                  ? 'It’s a draw.'
                  : winnerId === myId
                    ? `You filled ${opponent?.name ?? 'your opponent'}’s cup. Victory!`
                    : `${opponent?.name ?? 'Your opponent'} uplifted you to the brim. They take it!`}
              </p>
              {endNote && <p className="mt-1.5 text-sm text-white/70 max-w-md">{endNote}</p>}
              <p className="mt-3 text-sm text-amber-100/85 tabular-nums">
                Uplift given — you: <strong>{oppBar}</strong> · {opponent?.name ?? 'them'}: <strong>{myBar}</strong>
              </p>
              <button
                type="button"
                onClick={leaveRoom}
                className="mt-6 rounded-full bg-amber-300 text-stone-900 px-6 py-2.5 text-sm font-black hover:bg-amber-200 transition-colors"
              >
                Back to the lobby
              </button>
            </div>
          )}
        </div>
      )}

      {/* Choice deck — below the arena so the 3D stage stays clean */}
      {phase === 'match' && turnScenario && (
        <div className="mt-4 rounded-3xl border border-black/10 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-white"
                style={{ backgroundColor: MOOD_COLORS[turnScenario.scenario.mood] }}
              >
                {turnScenario.scenario.stateLabel}
              </span>
              <p className="text-sm text-foreground/75 leading-snug min-w-0">
                {iAmReceiver ? (
                  <><strong>You&rsquo;re</strong> {turnScenario.scenario.flavor.charAt(0).toLowerCase()}{turnScenario.scenario.flavor.slice(1)}</>
                ) : (
                  <><strong>{opponent?.name ?? 'They'}</strong> — {turnScenario.scenario.flavor}</>
                )}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              {myStreak >= 2 && iAmActor && (
                <span className="text-[11px] font-black text-amber-600 uppercase tracking-wider">🔥 combo ×{myStreak}</span>
              )}
              <span
                className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-[3px] text-sm font-black tabular-nums ${
                  secondsLeft <= 4 ? 'border-red-400 text-red-600' : 'border-amber-300 text-foreground'
                }`}
              >
                {secondsLeft}
              </span>
            </div>
          </div>

          {iAmActor ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {turnScenario.order.map((choiceIdx, displayIdx) => (
                <button
                  key={displayIdx}
                  type="button"
                  onClick={() => pick(displayIdx)}
                  disabled={picked}
                  className="text-left rounded-2xl border border-black/10 bg-amber-50/50 hover:bg-amber-100/80 hover:border-amber-300 transition-colors px-4 py-3 text-[13.5px] leading-relaxed text-foreground/85 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 mr-2 rounded-md bg-foreground/8 text-[11px] font-black text-foreground/55 align-middle">
                    {displayIdx + 1}
                  </span>
                  {turnScenario.scenario.choices[choiceIdx].text}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/55 italic py-3 text-center">
              {opponent?.name ?? 'Your opponent'} is finding the right words for you…
            </p>
          )}
        </div>
      )}

      {/* Pop-in keyframes for the feedback splash. */}
      <style>{`
        @keyframes uplift-pop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Fighting-game power bar that FILLS toward the win. Mirrored per
// side so both bars grow toward the center VS badge.
function PowerBar({ side, name, avatar, value, active }: {
  side: 'left' | 'right';
  name: string;
  avatar: string | null;
  value: number;
  active: boolean; // this player is the one currently being uplifted
}) {
  const pct = Math.min(100, (value / BAR_MAX) * 100);
  const mirrored = side === 'right';
  return (
    <div className={`flex-1 min-w-0 ${mirrored ? 'text-right' : ''}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${mirrored ? 'flex-row-reverse' : ''}`}>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover border-2 border-amber-200/80 shadow" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-amber-200 text-stone-800 text-xs font-black flex items-center justify-center border-2 border-amber-100/80 shadow">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <p className="text-xs sm:text-sm font-black text-white drop-shadow truncate uppercase tracking-wide">{name}</p>
        {active && <span className="shrink-0 w-2 h-2 rounded-full bg-amber-300 animate-pulse shadow-[0_0_8px_rgba(252,211,77,0.9)]" />}
      </div>
      <div className={`h-4 sm:h-5 rounded-full bg-black/45 border border-amber-100/25 overflow-hidden ${mirrored ? 'scale-x-[-1]' : ''}`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-yellow-100 shadow-[0_0_14px_rgba(252,211,77,0.55)] transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-1 text-[10px] font-bold text-amber-100/80 tabular-nums drop-shadow ${mirrored ? '' : ''}`}>
        {value} / {BAR_MAX} uplifted
      </p>
    </div>
  );
}
