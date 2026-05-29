import { motion, AnimatePresence } from 'framer-motion';
import type { NeteaseSongMeta } from '../../lib/netease-music-shared';

type MusicSectionProps = {
  formData: any;
  handleUpdate: (field: string, value: any) => void;
  pushToQueue: (label: string, key?: string, value?: any) => void;
  onSaveCloudMusicIds: () => void;
  musicDetails: Record<string, any>;
  searchMusic: () => void;
  searchLoading: boolean;
  searchResults: NeteaseSongMeta[];
  addSongToPlaylist: (song: NeteaseSongMeta) => void;
  removeSong: (index: number) => void;
  cloudMusicIds: string[];
};

export default function MusicSection({
  formData,
  handleUpdate,
  pushToQueue,
  onSaveCloudMusicIds,
  musicDetails,
  searchMusic,
  searchLoading,
  searchResults,
  addSongToPlaylist,
  removeSong,
  cloudMusicIds,
}: MusicSectionProps) {
  const idSet = new Set(cloudMusicIds.map(String));

  return (
    <motion.section
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-slate-800/50 rounded-[40px] p-8 shadow-2xl"
    >
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4">🎵 歌单管理与搜索</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-4">
            当前播放列表 ({cloudMusicIds.length})
          </p>
          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {cloudMusicIds.length === 0 ? (
              <p className="text-xs text-slate-400 px-2">还没有歌曲，在右侧搜索并添加吧</p>
            ) : (
              cloudMusicIds.map((id: string, index: number) => {
                const songId = String(id);
                const detail = musicDetails[songId];
                const isInvalid = detail?.error || /[|#]/.test(songId) || /^kg:/i.test(songId);
                return (
                  <div
                    key={`${songId}-${index}`}
                    className={`flex items-center gap-3 p-3 rounded-2xl border ${
                      isInvalid
                        ? 'bg-red-500/5 border-red-400/30'
                        : 'bg-white/50 dark:bg-slate-800/50 border-white/50 dark:border-slate-700/50'
                    }`}
                  >
                    {detail?.cover ? (
                      <img src={detail.cover} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {detail?.name || '正在加载…'}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{detail?.artist || songId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSong(index)}
                      className="text-[10px] font-black text-red-500 hover:underline shrink-0"
                    >
                      移除
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.musicSearchQuery || ''}
              onChange={(e) => handleUpdate('musicSearchQuery', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchMusic()}
              placeholder="搜索歌名或歌手…"
              className="flex-1 px-4 py-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/50 dark:border-slate-700 text-sm"
            />
            <button
              type="button"
              onClick={searchMusic}
              disabled={searchLoading}
              className="px-5 py-3 rounded-2xl bg-indigo-500 text-white text-xs font-black disabled:opacity-50"
            >
              {searchLoading ? '搜索中…' : '搜索'}
            </button>
          </div>

          <div className="max-h-[320px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            <AnimatePresence>
              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-400 px-2">输入关键词后点击搜索</p>
              ) : (
                searchResults.map((song) => {
                  const added = idSet.has(String(song.id));
                  return (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-white/50 dark:border-slate-700/50"
                    >
                      {song.cover ? (
                        <img src={song.cover} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{song.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{song.artist}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addSongToPlaylist(song)}
                        disabled={added}
                        className="text-[10px] font-black text-indigo-500 hover:underline disabled:opacity-40 shrink-0"
                      >
                        {added ? '已添加' : '添加'}
                      </button>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => onSaveCloudMusicIds()}
            className="w-full py-4 bg-indigo-500 text-white rounded-2xl text-sm font-black shadow-xl active:scale-95 transition-all"
          >
            保存到数据库（与前台音乐页同步）
          </button>
          <button
            type="button"
            onClick={() => pushToQueue('网易云歌单', 'cloudMusicIds', cloudMusicIds)}
            className="w-full py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold active:scale-95 transition-all"
          >
            加入操作队列（同步 siteConfig 文件）
          </button>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            搜索歌名即可添加并同步到前台音乐页。
          </p>
        </div>
      </div>
    </motion.section>
  );
}
