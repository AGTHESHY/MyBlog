"use client";

import { useState, useRef, useEffect } from 'react';
import { fetchMetingSong, mapMetingToPlaylistItem } from '../lib/netease-music';

function parseLrc(lrcText: string) {
  if (!lrcText || lrcText.length > 20000) return [];
  const lines = lrcText.split('\n');
  const result: { time: number; text: string }[] = [];
  for (const line of lines) {
    const matches = [...line.matchAll(/\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g)];
    if (matches.length > 0) {
      const text = line.replace(/\[\d{2,}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
      if (text) {
        for (const match of matches) {
          const min = parseInt(match[1], 10);
          const sec = parseInt(match[2], 10);
          const ms = match[3] ? parseInt(match[3], 10) : 0;
          const time = min * 60 + sec + ms / (match[3] && match[3].length === 3 ? 1000 : 100);
          result.push({ time, text });
        }
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

const formatTime = (time: number) => {
  if (!time || isNaN(time)) return '00:00';
  const m = Math.floor(time / 60).toString().padStart(2, '0');
  const s = Math.floor(time % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function CloudPlayer({ songIds }: { songIds: string[] }) {
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyrics, setLyrics] = useState<{ time: number; text: string }[]>([]);
  const [currentLyric, setCurrentLyric] = useState('正在连接网易云...');
  const [displayedLyric, setDisplayedLyric] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMusicData = async () => {
      try {
        const results = await Promise.all(
          songIds.map(async (id) => {
            const song = await fetchMetingSong(id);
            if (!song?.url) return null;
            return mapMetingToPlaylistItem(song, id);
          })
        );
        const mergedPlaylist = results.filter((s): s is NonNullable<typeof s> => !!s && !!s.src);

        if (isMounted) {
          if (mergedPlaylist.length > 0) setPlaylist(mergedPlaylist);
          else setCurrentLyric('音乐流被拦截，可能是版权限制');
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setCurrentLyric('云端连接失败，请检查网络');
          setIsLoading(false);
        }
      }
    };

    if (songIds?.length > 0) fetchMusicData();
    else {
      setIsLoading(false);
      setCurrentLyric('请配置 cloudMusicIds');
    }
    return () => {
      isMounted = false;
    };
  }, [songIds]);

  useEffect(() => {
    if (playlist.length === 0) return;
    let isMounted = true;
    const currentSong = playlist[currentIndex];
    setCurrentLyric('正在解析歌词...');
    setLyrics([]);

    const applyLrc = (text: string) => {
      const parsed = parseLrc(text);
      if (parsed.length > 0) {
        setLyrics(parsed);
        setCurrentLyric(parsed[0].text);
      } else {
        setCurrentLyric('♪ 纯享音乐 ♪');
      }
    };

    if (currentSong.lrcUrl) {
      fetch(currentSong.lrcUrl)
        .then((res) => {
          if (!res.ok) throw new Error('失败');
          return res.text();
        })
        .then((text) => {
          if (isMounted) applyLrc(text);
        })
        .catch(() => {
          if (isMounted) setCurrentLyric('♪ 纯享音乐 ♪');
        });
    } else if (isMounted) {
      setCurrentLyric('♪ 纯享音乐 ♪');
    }

    if (isPlaying && audioRef.current) {
      setTimeout(() => audioRef.current?.play().catch(() => setIsPlaying(false)), 150);
    }
    return () => {
      isMounted = false;
    };
  }, [currentIndex, playlist, isPlaying]);

  useEffect(() => {
    setDisplayedLyric('');
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < currentLyric.length) {
        setDisplayedLyric((prev) => prev + currentLyric.charAt(i));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, 40);
    return () => clearInterval(typingInterval);
  }, [currentLyric]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(!isPlaying);
    }
  };

  const nextSong = () => setCurrentIndex((prev) => (prev + 1) % playlist.length);
  const prevSong = () => setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = Number(e.target.value);
    setProgress(newProgress);
    if (audioRef.current?.duration) {
      audioRef.current.currentTime = (newProgress / 100) * audioRef.current.duration;
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  if (isLoading) {
    return (
      <div className="md:col-span-5 rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl p-6 flex flex-col items-center justify-center transition-colors duration-700 h-[220px]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <span className="text-slate-800 dark:text-white font-bold tracking-widest animate-pulse text-sm">
          CONNECTING...
        </span>
      </div>
    );
  }

  if (playlist.length === 0) {
    return (
      <div className="md:col-span-5 rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl p-6 flex flex-col items-center justify-center h-[220px]">
        <span className="text-slate-600 dark:text-slate-300 text-sm text-center px-4">{currentLyric}</span>
      </div>
    );
  }

  const song = playlist[currentIndex];

  return (
    <div className="md:col-span-5 rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl p-4 flex flex-col gap-3 h-[220px]">
      <div className="flex items-center gap-3">
        <img src={song.cover} alt="" className="w-14 h-14 rounded-xl object-cover shadow-md" />
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-800 dark:text-white text-sm truncate">{song.title}</p>
          <p className="text-xs text-slate-500 truncate">{song.artist}</p>
        </div>
      </div>
      <p className="text-center text-sm font-bold text-indigo-600 dark:text-indigo-300 min-h-[1.25rem] truncate px-2">
        {displayedLyric || currentLyric}
      </p>
      <div className="flex items-center gap-2 mt-auto">
        <button type="button" onClick={prevSong} className="text-xs font-bold text-slate-500">
          ⏮
        </button>
        <button type="button" onClick={togglePlay} className="flex-1 py-2 bg-indigo-500 text-white rounded-xl text-xs font-black">
          {isPlaying ? '暂停' : '播放'}
        </button>
        <button type="button" onClick={nextSong} className="text-xs font-bold text-slate-500">
          ⏭
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={progress}
        onChange={handleSeek}
        className="w-full accent-indigo-500"
      />
      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      <audio ref={audioRef} src={song.src} onTimeUpdate={handleTimeUpdate} />
    </div>
  );
}
