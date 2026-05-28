import { motion, AnimatePresence } from 'framer-motion';
import type { NeteaseSongMeta } from '../../lib/netease-music';

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
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-8">🎵 歌单管理与搜索</h2>
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
                const detail = musicDetails[id];
                const isInvalid = detail?.error || /[|#]/.test(id) || /^kg:/i.test(id);
                return (
                  <div
                    key={`${id}-${index}`}
                    className={`flex justify-between items-center p-3 rounded-2xl border group ${
                      isInvalid
                        ? 'bg-red-500/10 border-red-400/40'
                        : 'bg-white/40 dark:bg-slate-800/40 border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {detail?.cover ? (
                        <img src={detail.cover} alt="cover" className="w-10 h-10 rounded-lg object-cover shadow-sm shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center text-xs shrink-0">
                          💿
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        {detail ? (
                          <>
                            <span
                              className={`text-sm font-bold line-clamp-1 ${
                                detail.error ? 'text-red-500' : 'text-slate-800 dark:text-white'
                              }`}
                            >
                              {detail.name}
                            </span>
                            {!detail.error && (
                              <span className="text-[10px] text-slate-500 font-medium line-clamp-1">{detail.artist}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">正在加载…</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSong(index)}
                      className="w-8 h-8 shrink-0 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-3xl p-6 space-y-4 flex flex-col">
          <p className="text-[10px] font-black text-slate-400 uppercase">搜索并添加歌曲</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="歌名、歌手，如：林俊杰 江南"
              value={formData.musicSearchQuery || ''}
              onChange={(e) => handleUpdate('musicSearchQuery', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') searchMusic();
              }}
              className="flex-1 bg-white dark:bg-slate-900 border-none rounded-2xl px-4 py-3 text-sm outline-none shadow-sm"
            />
            <button
              type="button"
              onClick={searchMusic}
              disabled={searchLoading}
              className="px-6 py-3 bg-pink-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-pink-500/20 disabled:opacity-50 shrink-0"
            >
              {searchLoading ? '搜索中…' : '搜索'}
            </button>
          </div>

          <div className="max-h-[280px] overflow-y-auto pr-1 space-y-2 custom-scrollbar flex-1 min-h-[120px]">
            <AnimatePresence mode="popLayout">
              {searchResults.length === 0 && !searchLoading ? (
                <p className="text-[10px] text-slate-400 px-1">输入关键词后点搜索，从结果里选歌加入列表</p>
              ) : (
                searchResults.map((song) => {
                  const added = idSet.has(String(song.id));
                  return (
                    <motion.div
                      key={song.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-white/30 dark:border-slate-700 flex items-center gap-3"
                    >
                      <img
                        src={song.cover || 'https://bu.dusays.com/2026/03/24/69c24230a5ff8.jpg'}
                        alt=""
                        className="w-11 h-11 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">{song.name}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{song.artist}</p>
                        {song.album ? (
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{song.album}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={added}
                        onClick={() => addSongToPlaylist(song)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black shrink-0 transition-colors ${
                          added
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
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
            保存到数据库（前台立即生效）
          </button>
          <button
            type="button"
            onClick={() => pushToQueue('网易云歌单', 'cloudMusicIds', cloudMusicIds)}
            className="w-full py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold active:scale-95 transition-all"
          >
            加入操作队列（同步 siteConfig 文件）
          </button>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            无需手动查歌曲 ID：搜索歌名或歌手即可添加。系统会在后台自动保存网易云 ID 用于播放。
          </p>
        </div>
      </div>
    </motion.section>
  );
}
