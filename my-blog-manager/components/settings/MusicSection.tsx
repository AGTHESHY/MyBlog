import { motion, AnimatePresence } from 'framer-motion';
import type { NeteaseSongMeta } from '../../lib/netease-music-shared';
import type { NeteaseAuthStatus } from '../../lib/netease-open-api';

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
  neteaseAuth: NeteaseAuthStatus | null;
  neteaseAuthLoading: boolean;
  neteaseShowQr: boolean;
  neteaseQrImage: string;
  neteaseQrStatus: string;
  neteaseQrCountdown: number;
  onNeteaseLogin: () => void;
  onNeteaseRefreshQr: () => void;
  onNeteaseCancelQr: () => void;
  onNeteaseLogout: () => void;
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
  neteaseAuth,
  neteaseAuthLoading,
  neteaseShowQr,
  neteaseQrImage,
  neteaseQrStatus,
  neteaseQrCountdown,
  onNeteaseLogin,
  onNeteaseRefreshQr,
  onNeteaseCancelQr,
  onNeteaseLogout,
}: MusicSectionProps) {
  const idSet = new Set(cloudMusicIds.map(String));
  const userLoggedIn = neteaseAuth?.loggedIn && neteaseAuth.tokenKind === 'user';
  const anonymousReady = neteaseAuth?.configured && neteaseAuth.tokenKind === 'client';

  return (
    <motion.section
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-slate-800/50 rounded-[40px] p-8 shadow-2xl"
    >
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4">🎵 歌单管理与搜索</h2>

      <div
        className={`mb-8 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          userLoggedIn
            ? 'bg-green-500/10 border-green-400/40'
            : 'bg-amber-500/10 border-amber-400/30'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {userLoggedIn && neteaseAuth?.user?.avatar ? (
            <img src={neteaseAuth.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 text-lg">
              ☁️
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800 dark:text-white">
              {userLoggedIn
                ? `已登录：${neteaseAuth?.user?.nickname || '网易云用户'}`
                : anonymousReady
                  ? '匿名模式（应用 token）'
                  : neteaseAuth?.configured
                    ? '开放平台已配置'
                    : '未配置开放平台（扫码按钮已禁用）'}
            </p>
            <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
              {userLoggedIn
                ? '当前使用用户级 token，可获取更高码率与 VIP 曲目播放权限'
                : !neteaseAuth?.configured
                  ? neteaseAuth?.message ||
                    '请在仓库根目录 .env 填写 NETEASE_APP_ID / NETEASE_APP_SECRET / NETEASE_PRIVATE_KEY，然后重启管理端'
                  : neteaseAuth?.message ||
                    '默认使用匿名 token；扫码登录后可播放更多 VIP 曲目'}
            </p>
            <div className="flex flex-wrap gap-3 mt-1">
              <a
                href="https://developer.music.163.com/st/developer/document?docId=2bb12a93e71a4be0842243b930c2f33c"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-indigo-500 hover:underline"
              >
                二维码登录文档 →
              </a>
              <a
                href="/api/music/netease/auth/debug"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-amber-600 hover:underline"
              >
                检测凭证是否生效 →
              </a>
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {userLoggedIn ? (
            <button
              type="button"
              onClick={onNeteaseLogout}
              disabled={neteaseAuthLoading}
              className="px-4 py-2 rounded-xl text-xs font-black bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              退出登录
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onNeteaseLogin}
                disabled={neteaseAuthLoading || !neteaseAuth?.configured}
                className="px-4 py-2 rounded-xl text-xs font-black bg-red-500 text-white shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {neteaseAuthLoading ? '加载中…' : neteaseShowQr ? '刷新二维码' : '扫码登录'}
              </button>
              {neteaseShowQr && (
                <button
                  type="button"
                  onClick={onNeteaseCancelQr}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  取消
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {neteaseShowQr && !userLoggedIn && (
        <div className="mb-8 p-5 rounded-2xl border border-red-400/30 bg-white/60 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0">
            {neteaseQrImage ? (
              <img
                src={neteaseQrImage}
                alt="网易云登录二维码"
                className="w-[220px] h-[220px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white"
              />
            ) : (
              <div className="w-[220px] h-[220px] rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            )}
            {neteaseQrCountdown > 0 && (
              <span className="absolute bottom-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-black/70 text-white">
                {neteaseQrCountdown}s
              </span>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <p className="text-sm font-black text-slate-800 dark:text-white">{neteaseQrStatus || '请扫码'}</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              使用<strong>网易云音乐 App</strong>扫描左侧二维码并确认登录。二维码约 2 分钟有效；未登录时默认使用匿名 token 仍可搜索与添加歌曲。
            </p>
            <button
              type="button"
              onClick={onNeteaseRefreshQr}
              disabled={neteaseAuthLoading}
              className="text-[10px] font-black text-indigo-500 hover:underline disabled:opacity-50"
            >
              二维码过期？点击刷新
            </button>
          </div>
        </div>
      )}

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
            搜索歌名即可添加；建议先完成上方「网易云账号登录」。在开放平台控制台配置回调地址与 .env 中 NETEASE_REDIRECT_URI 一致。
          </p>
        </div>
      </div>
    </motion.section>
  );
}
