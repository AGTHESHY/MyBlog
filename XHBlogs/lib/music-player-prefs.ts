export type MusicPlayMode = 'loop' | 'single' | 'random';

export type MusicPlayerPrefs = {
  playMode: MusicPlayMode;
  volume: number;
  isMuted: boolean;
  currentSongId: string | null;
};

const STORAGE_KEY = 'xhblogs_music_player_prefs';

const DEFAULT_PREFS: MusicPlayerPrefs = {
  playMode: 'loop',
  volume: 1,
  isMuted: false,
  currentSongId: null,
};

export function loadMusicPlayerPrefs(): MusicPlayerPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<MusicPlayerPrefs>;
    const playMode =
      parsed.playMode === 'loop' || parsed.playMode === 'single' || parsed.playMode === 'random'
        ? parsed.playMode
        : DEFAULT_PREFS.playMode;
    const volume =
      typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1
        ? parsed.volume
        : DEFAULT_PREFS.volume;
    const isMuted = typeof parsed.isMuted === 'boolean' ? parsed.isMuted : DEFAULT_PREFS.isMuted;
    const currentSongId =
      typeof parsed.currentSongId === 'string' && parsed.currentSongId.trim()
        ? parsed.currentSongId.trim()
        : null;
    return { playMode, volume, isMuted, currentSongId };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveMusicPlayerPrefs(patch: Partial<MusicPlayerPrefs>) {
  if (typeof window === 'undefined') return;
  try {
    const next = { ...loadMusicPlayerPrefs(), ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

export function findPlaylistIndexBySongId(playlist: { id?: string }[], songId: string | null): number {
  if (!songId) return -1;
  return playlist.findIndex((s) => String(s.id) === songId);
}
