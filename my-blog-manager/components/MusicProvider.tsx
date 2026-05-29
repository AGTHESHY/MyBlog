"use client";

import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { useSiteConfig } from './SiteConfigProvider';
import { filterValidNeteaseSongIds, mapPlayableToPlaylistItem } from '../lib/netease-music-shared';
import {
  findPlaylistIndexBySongId,
  loadMusicPlayerPrefs,
  saveMusicPlayerPrefs,
  type MusicPlayMode,
} from '../lib/music-player-prefs';

type LoadStatus = 'loading' | 'ready' | 'empty' | 'failed';

function parseLrc(lrcText: string) {
  if (!lrcText || lrcText.length > 30000) return [];

  const lines = lrcText.split(/\r?\n/);
  const result: { time: number; text: string }[] = [];

  for (const line of lines) {
    const matches = [...line.matchAll(/\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g)];
    if (matches.length === 0) continue;
    const text = line.replace(/\[\d{2,}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
    const cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
    if (!cleanText) continue;
    for (const match of matches) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3], 10) : 0;
      const divisor = match[3] && match[3].length === 3 ? 1000 : 100;
      result.push({ time: min * 60 + sec + ms / divisor, text: cleanText });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

interface MusicContextType {
  playlist: any[];
  currentIndex: number;
  currentSong: any;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  currentLyric: string;
  isLoading: boolean;
  loadStatus: LoadStatus;
  loadMessage: string;
  volume: number;
  isMuted: boolean;
  playMode: MusicPlayMode;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  playSong: (index: number) => void;
  selectSong: (index: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  togglePlayMode: () => void;
  ensureInitialized: () => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const siteConfig = useSiteConfig();
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyrics, setLyrics] = useState<{ time: number; text: string }[]>([]);
  const [currentLyric, setCurrentLyric] = useState('♪ 点击播放加载音乐 ♪');
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadMessage, setLoadMessage] = useState('');
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playMode, setPlayMode] = useState<MusicPlayMode>('loop');
  const prefsHydratedRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceIdsRef = useRef('');
  const musicServicesStartedRef = useRef(false);
  const syncCleanupRef = useRef<(() => void) | null>(null);

  const syncPlaylistFromServer = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent;
    if (!silent) {
      setIsLoading(true);
      setLoadStatus('loading');
    }

    try {
      let musicIds: string[] = [];
      try {
        const cfgRes = await fetch('/api/site/cloud-music-ids', { cache: 'no-store' });
        const cfgJson = await cfgRes.json();
        if (cfgJson?.success && Array.isArray(cfgJson.data?.ids)) {
          musicIds = filterValidNeteaseSongIds(cfgJson.data.ids.map(String));
        } else {
          musicIds = filterValidNeteaseSongIds([...(siteConfig.cloudMusicIds || [])].map(String));
        }
      } catch {
        musicIds = filterValidNeteaseSongIds([...(siteConfig.cloudMusicIds || [])].map(String));
      }

      const idsKey = musicIds.join('|');
      if (silent && idsKey === sourceIdsRef.current) return;
      sourceIdsRef.current = idsKey;

      if (musicIds.length === 0) {
        setPlaylist([]);
        setCurrentIndex(0);
        setIsPlaying(false);
        setLoadStatus('empty');
        setLoadMessage('播放列表为空，请在「设置 → 音乐播放设置」中添加歌曲。');
        setCurrentLyric('暂无曲目');
        return;
      }

      const results = await Promise.all(
        musicIds.map(async (id) => {
          try {
            const res = await fetch(`/api/music/play/${encodeURIComponent(id)}`, { cache: 'no-store' });
            const json = await res.json();
            if (!json?.success || !json.data?.src) return null;
            return mapPlayableToPlaylistItem(json.data);
          } catch {
            return null;
          }
        })
      );

      const mergedPlaylist = results.filter((s): s is NonNullable<typeof s> => !!s && !!s.src);

      if (mergedPlaylist.length > 0) {
        const prefs = loadMusicPlayerPrefs();
        const savedIdx = findPlaylistIndexBySongId(mergedPlaylist, prefs.currentSongId);
        setPlaylist(mergedPlaylist);
        setCurrentIndex(savedIdx >= 0 ? savedIdx : 0);
        setLoadStatus('ready');
        setLoadMessage('');
      } else {
        setPlaylist([]);
        setCurrentIndex(0);
        setLoadStatus('failed');
        setLoadMessage(
          `已配置 ${musicIds.length} 首，但无法获取播放地址。请确认网易云数字 ID，并配置 NETEASE_APP_ID / NETEASE_APP_SECRET / NETEASE_PRIVATE_KEY。`
        );
        setCurrentLyric('云端链路受阻');
      }
    } catch {
      setLoadStatus('failed');
      setLoadMessage('网络初始化失败');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [siteConfig.cloudMusicIds]);

  const startBackgroundSync = useCallback(() => {
    if (musicServicesStartedRef.current) return;
    musicServicesStartedRef.current = true;

    let cancelled = false;

    const run = async () => {
      if (!cancelled) await syncPlaylistFromServer();
    };
    run();

    const timer = setInterval(() => {
      if (!cancelled) syncPlaylistFromServer({ silent: true });
    }, 6000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        syncPlaylistFromServer({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    syncCleanupRef.current = () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      musicServicesStartedRef.current = false;
    };
  }, [syncPlaylistFromServer]);

  const ensureInitialized = useCallback(() => {
    startBackgroundSync();
  }, [startBackgroundSync]);

  useEffect(() => {
    return () => {
      syncCleanupRef.current?.();
      syncCleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const prefs = loadMusicPlayerPrefs();
    setPlayMode(prefs.playMode);
    setVolumeState(prefs.volume);
    setIsMuted(prefs.isMuted);
    prefsHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!prefsHydratedRef.current) return;
    saveMusicPlayerPrefs({ playMode, volume, isMuted });
  }, [playMode, volume, isMuted]);

  useEffect(() => {
    const songId = playlist[currentIndex]?.id;
    if (songId != null) {
      saveMusicPlayerPrefs({ currentSongId: String(songId) });
    }
  }, [currentIndex, playlist]);

  useEffect(() => {
    if (playlist.length === 0) return;
    let isMounted = true;
    const currentSong = playlist[currentIndex];
    setLyrics([]);
    setCurrentLyric('♪ 正在缓冲 ♪');

    const loadLyrics = (text: string) => {
      const parsed = parseLrc(text);
      setLyrics(parsed);
      setCurrentLyric(parsed.length > 0 ? parsed[0].text : '♪ 纯享音乐 ♪');
      setPlaylist((prev) => {
        const newPlaylist = [...prev];
        if (newPlaylist[currentIndex]) {
          newPlaylist[currentIndex].lyrics = parsed;
          newPlaylist[currentIndex].lrc = text;
        }
        return newPlaylist;
      });
    };

    if (typeof currentSong.lrc === 'string' && currentSong.lrc.length > 0) {
      if (isMounted) loadLyrics(currentSong.lrc);
    } else if (currentSong.lrcUrl) {
      fetch(currentSong.lrcUrl)
        .then((res) => res.text())
        .then((text) => {
          if (isMounted) loadLyrics(text);
        })
        .catch(() => {
          if (isMounted) setCurrentLyric('♪ 纯享音乐 ♪');
        });
    } else if (isMounted) {
      setCurrentLyric('♪ 纯享音乐 ♪');
    }

    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
    return () => {
      isMounted = false;
    };
  }, [currentIndex, playlist.length, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    ensureInitialized();
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(!isPlaying);
    }
  };

  const nextSong = () => {
    ensureInitialized();
    if (playlist.length === 0) return;
    if (playMode === 'random') {
      setCurrentIndex(Math.floor(Math.random() * playlist.length));
    } else {
      setCurrentIndex((prev) => (prev + 1) % playlist.length);
    }
  };

  const prevSong = () => {
    ensureInitialized();
    if (playlist.length === 0) return;
    if (playMode === 'random') {
      setCurrentIndex(Math.floor(Math.random() * playlist.length));
    } else {
      setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    }
  };

  const playSong = (index: number) => {
    ensureInitialized();
    setCurrentIndex(index);
    if (!isPlaying) setIsPlaying(true);
  };

  const selectSong = playSong;

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const { currentTime: ct, duration: dur } = audioRef.current;
      setCurrentTime(ct);
      setDuration(dur || 0);
      setProgress((ct / (dur || 1)) * 100);

      if (lyrics.length > 0) {
        const activeLyric = lyrics.slice().reverse().find((l) => ct >= l.time);
        if (activeLyric && activeLyric.text !== currentLyric) {
          setCurrentLyric(activeLyric.text);
        }
      }
    }
  };

  const handleEnded = () => {
    if (playMode === 'single' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      nextSong();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = Number(e.target.value);
    setProgress(newProgress);
    if (audioRef.current?.duration) {
      audioRef.current.currentTime = (newProgress / 100) * audioRef.current.duration;
    }
  };

  const setVolume = (val: number) => {
    setVolumeState(val);
    if (isMuted && val > 0) setIsMuted(false);
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const togglePlayMode = () => {
    setPlayMode((prev) => {
      const next: MusicPlayMode =
        prev === 'loop' ? 'single' : prev === 'single' ? 'random' : 'loop';
      saveMusicPlayerPrefs({ playMode: next });
      return next;
    });
  };

  const currentSong = playlist[currentIndex];

  return (
    <MusicContext.Provider
      value={{
        playlist,
        currentIndex,
        currentSong,
        isPlaying,
        progress,
        currentTime,
        duration,
        currentLyric,
        isLoading,
        loadStatus,
        loadMessage,
        volume,
        isMuted,
        playMode,
        togglePlay,
        nextSong,
        prevSong,
        handleSeek,
        playSong,
        selectSong,
        setVolume,
        toggleMute,
        togglePlayMode,
        ensureInitialized,
      }}
    >
      {children}
      {currentSong?.src ? (
        <audio
          ref={audioRef}
          src={currentSong.src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={handleTimeUpdate}
        />
      ) : null}
    </MusicContext.Provider>
  );
}

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within MusicProvider');
  return context;
};
