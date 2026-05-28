import { motion, AnimatePresence } from 'framer-motion';

type KugouUser = { nickname: string; pic: string; userid: string } | null;

type KugouPlaylist = {
  id: string;
  name: string;
  count: number;
  cover: string;
  isFavorite: boolean;
};

export default function MusicSection({
  formData,
  handleUpdate,
  pushToQueue,
  musicDetails,
  queryMusic,
  queryLoading,
  queryResult,
  confirmAddMusic,
  removeSong,
  searchByName,
  searchLoading,
  searchResults,
  addSearchSong,
  importPlaylist,
  playlistLoading,
  kugouUser,
  kugouQrImage,
  kugouLoginStatus,
  kugouQrCountdown,
  kugouLoginLoading,
  startKugouLogin,
  logoutKugou,
  kugouPlaylists,
  kugouPlaylistsLoading,
  loadKugouPlaylists,
  importKugouPlaylist,
  kugouImportId,
  kugouLoginTab,
  setKugouLoginTab,
  kugouPhoneLoginEnabled,
  kugouOpenApiMode,
  kugouConfigHint,
  kugouPhone,
  setKugouPhone,
  kugouSmsCode,
  setKugouSmsCode,
  kugouSmsCooldown,
  kugouPhoneLoading,
  sendKugouSms,
  loginKugouByPhone,
}: {
  formData: any;
  handleUpdate: (field: string, value: any) => void;
  pushToQueue: (label: string, key?: string, value?: any) => void;
  musicDetails: Record<string, any>;
  queryMusic: () => void;
  queryLoading: boolean;
  queryResult: any;
  confirmAddMusic: () => void;
  removeSong: (index: number) => void;
  searchByName: () => void;
  searchLoading: boolean;
  searchResults: any[];
  addSearchSong: (song: any) => void;
  importPlaylist: () => void;
  playlistLoading: boolean;
  kugouUser: KugouUser;
  kugouQrImage: string;
  kugouLoginStatus: string;
  kugouQrCountdown: number;
  kugouLoginLoading: boolean;
  startKugouLogin: () => void;
  logoutKugou: () => void;
  kugouPlaylists: KugouPlaylist[];
  kugouPlaylistsLoading: boolean;
  loadKugouPlaylists: () => void;
  importKugouPlaylist: (id: string, name: string) => void;
  kugouImportId: string;
  kugouLoginTab: 'qr' | 'phone';
  setKugouLoginTab: (tab: 'qr' | 'phone') => void;
  kugouPhoneLoginEnabled: boolean;
  kugouOpenApiMode: boolean;
  kugouConfigHint: string;
  kugouPhone: string;
  setKugouPhone: (v: string) => void;
  kugouSmsCode: string;
  setKugouSmsCode: (v: string) => void;
  kugouSmsCooldown: number;
  kugouPhoneLoading: boolean;
  sendKugouSms: () => void;
  loginKugouByPhone: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-slate-800/50 rounded-[40px] p-8 shadow-2xl"
    >
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">🎵 歌单管理</h2>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        先<strong className="text-slate-700 dark:text-slate-300">登录酷狗</strong>，左侧会显示该账号歌单；导入或搜索的歌曲进入右侧「博客播放列表」，最后点「暂存音乐修改」。
      </p>
      {kugouConfigHint ? (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
          {kugouConfigHint}
        </div>
      ) : null}
      <details className="mb-6 text-xs text-slate-600 dark:text-slate-400 bg-slate-100/40 dark:bg-slate-800/30 rounded-2xl px-4 py-3">
        <summary className="font-bold cursor-pointer select-none text-slate-700 dark:text-slate-300">
          完整登录与导入说明
        </summary>
        <ol className="mt-3 space-y-2 list-decimal list-inside leading-relaxed">
          <li>
            <strong>扫码登录（官方推荐）</strong>：对接
            <a
              href="https://open.kugou.com/docs/iot-solution/#/OPENAPI/README?id=%e7%94%a8%e6%88%b7"
              target="_blank"
              rel="noreferrer"
              className="text-violet-600 underline mx-0.5"
            >
              酷狗牛方案 OpenAPI
            </a>
            ，需配置 <code className="text-[10px]">KUGOU_IOT_PID</code> / <code className="text-[10px]">KUGOU_IOT_PKEY</code>
            → 获取二维码 → App 扫码确认。
          </li>
          <li>
            <strong>手机号登录</strong>：官方 OpenAPI 不提供，本后台仅支持扫码登录。
          </li>
          <li>登录成功后，<strong>左侧自动加载</strong>该账号歌单（含「我喜欢」），点「导入」写入博客列表。</li>
          <li>也可在右侧按歌名搜索、粘贴公开歌单链接，或使用高级 hash 添加。</li>
          <li>确认博客列表无误后，点击「暂存音乐修改」，再在右上角操作队列同步到前台站点。</li>
        </ol>
      </details>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* 左侧：仅账号歌单 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 ml-1 mb-4">
            <p className="text-[10px] font-black text-slate-400 uppercase">
              {kugouUser ? `${kugouUser.nickname} 的歌单` : '我的酷狗歌单'}
              {kugouUser && kugouPlaylists.length > 0 ? ` (${kugouPlaylists.length})` : ''}
            </p>
            {kugouUser && (
              <button
                onClick={loadKugouPlaylists}
                disabled={kugouPlaylistsLoading}
                className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline disabled:opacity-50"
              >
                {kugouPlaylistsLoading ? '刷新中…' : '刷新'}
              </button>
            )}
          </div>

          <div className="max-h-[480px] overflow-y-auto pr-2 space-y-2 custom-scrollbar min-h-[200px]">
            {!kugouUser ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl bg-slate-100/50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-600">
                <span className="text-4xl mb-3 opacity-40">📋</span>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">请先扫码登录</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  登录后此处会列出该酷狗账号下的全部歌单（含「我喜欢」），点「导入」可加入博客播放列表。
                </p>
              </div>
            ) : kugouPlaylistsLoading && kugouPlaylists.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400 animate-pulse">正在加载歌单…</div>
            ) : kugouPlaylists.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">
                暂无歌单，请点击右上角「刷新」
              </div>
            ) : (
              kugouPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-center justify-between gap-2 p-3 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {pl.cover ? (
                      <img src={pl.cover} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-sm" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-violet-500/20 shrink-0 flex items-center justify-center text-lg">
                        {pl.isFavorite ? '❤️' : '📁'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">
                        {pl.name}
                        {pl.isFavorite && (
                          <span className="ml-1 text-[9px] text-pink-500 font-black">收藏</span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500">{pl.count || '?'} 首</p>
                    </div>
                  </div>
                  <button
                    onClick={() => importKugouPlaylist(pl.id, pl.name)}
                    disabled={kugouImportId === pl.id}
                    className="px-3 py-2 text-[10px] font-black bg-violet-500 text-white rounded-xl shrink-0 disabled:opacity-50 shadow-sm"
                  >
                    {kugouImportId === pl.id ? '导入中' : '导入'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧：登录 / 搜索 / 博客列表 */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 dark:from-violet-900/30 dark:to-indigo-900/20 rounded-3xl p-6 space-y-4 border border-violet-500/20">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black text-violet-600 dark:text-violet-300 uppercase">酷狗账号登录</p>
              {kugouUser && (
                <button
                  onClick={logoutKugou}
                  className="text-[10px] font-bold text-slate-500 hover:text-red-500 transition-colors"
                >
                  退出
                </button>
              )}
            </div>

            {!kugouUser ? (
              <>
                <div className="flex gap-2 p-1 bg-white/50 dark:bg-slate-900/50 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setKugouLoginTab('qr')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${kugouLoginTab === 'qr' ? 'bg-violet-600 text-white shadow' : 'text-slate-500'}`}
                  >
                    扫码登录{kugouOpenApiMode ? '（官方）' : ''}
                  </button>
                  {kugouPhoneLoginEnabled && (
                    <button
                      type="button"
                      onClick={() => setKugouLoginTab('phone')}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${kugouLoginTab === 'phone' ? 'bg-violet-600 text-white shadow' : 'text-slate-500'}`}
                    >
                      手机号（非官方）
                    </button>
                  )}
                </div>
                {kugouOpenApiMode && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    已启用酷狗牛方案官方接口，请使用扫码登录。
                  </p>
                )}

                {kugouLoginTab === 'qr' ? (
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div
                      className={`w-[180px] h-[180px] shrink-0 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-inner relative ${!kugouQrImage ? 'border-2 border-dashed border-violet-300/50' : ''}`}
                    >
                      {kugouQrImage ? (
                        <>
                          <img src={kugouQrImage} alt="酷狗登录二维码" className="w-full h-full object-contain" />
                          {kugouQrCountdown > 0 && (
                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-mono">
                              {kugouQrCountdown}s
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-4xl opacity-30">📱</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-3 text-center sm:text-left">
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        打开<strong>酷狗音乐 App</strong> → 扫一扫 → 扫描本页二维码 → 在手机上<strong>立即</strong>点确认。
                        若提示「确认已失效」，请点「刷新二维码」后重新扫（勿重复扫旧码）。
                      </p>
                      <p
                        className={`text-[10px] font-medium min-h-[1.25rem] ${kugouLoginStatus.includes('过期') ? 'text-amber-600 dark:text-amber-400' : 'text-violet-600 dark:text-violet-400'}`}
                      >
                        {kugouLoginStatus || '点击下方获取二维码'}
                      </p>
                      <button
                        onClick={startKugouLogin}
                        disabled={kugouLoginLoading && !!kugouQrImage && kugouQrCountdown <= 0}
                        className="w-full sm:w-auto px-6 py-3 bg-violet-600 text-white rounded-2xl text-xs font-black shadow-lg disabled:opacity-50"
                      >
                        {kugouLoginLoading && kugouQrImage
                          ? kugouQrCountdown > 0
                            ? `等待扫码（${kugouQrCountdown}s）`
                            : '刷新二维码'
                          : kugouQrImage
                            ? '刷新二维码'
                            : '获取登录二维码'}
                      </button>
                    </div>
                  </div>
                ) : kugouPhoneLoginEnabled ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      此为<strong>非官方</strong>旧接口，仅作备用；官方牛方案请使用扫码。验证码由酷狗下发，本页不存密码。
                    </p>
                    <input
                      type="tel"
                      placeholder="11 位手机号"
                      maxLength={11}
                      value={kugouPhone}
                      onChange={(e) => setKugouPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl px-4 py-3 text-sm outline-none shadow-sm"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="短信验证码"
                        maxLength={8}
                        value={kugouSmsCode}
                        onChange={(e) => setKugouSmsCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className="flex-1 bg-white dark:bg-slate-900 border-none rounded-2xl px-4 py-3 text-sm outline-none shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={sendKugouSms}
                        disabled={kugouPhoneLoading || kugouSmsCooldown > 0 || kugouPhone.length < 11}
                        className="px-4 py-3 bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-300 rounded-2xl text-[10px] font-black shrink-0 disabled:opacity-50"
                      >
                        {kugouSmsCooldown > 0 ? `${kugouSmsCooldown}s` : '获取验证码'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={loginKugouByPhone}
                      disabled={kugouPhoneLoading || kugouPhone.length < 11 || !kugouSmsCode}
                      className="w-full py-3 bg-violet-600 text-white rounded-2xl text-xs font-black shadow-lg disabled:opacity-50"
                    >
                      {kugouPhoneLoading ? '登录中…' : '手机号登录'}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-900/60 rounded-2xl">
                {kugouUser.pic ? (
                  <img src={kugouUser.pic} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-lg">🎧</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{kugouUser.nickname}</p>
                  <p className="text-[10px] text-slate-500">已登录 · 歌单见左侧列表</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-3xl p-6 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase">按歌名 / 歌手搜索</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="例如：云月谣 兰音"
                value={formData.musicSearchKeyword || ''}
                onChange={(e) => handleUpdate('musicSearchKeyword', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchByName()}
                className="flex-1 bg-white dark:bg-slate-900 border-none rounded-2xl px-4 py-3 text-sm outline-none shadow-sm"
              />
              <button
                onClick={searchByName}
                disabled={searchLoading}
                className="px-5 py-3 bg-indigo-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {searchLoading ? '搜索中' : '搜索'}
              </button>
            </div>
            {searchResults?.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {searchResults.map((song: any) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {song.cover ? (
                        <img src={song.cover} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-slate-200 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold line-clamp-1">{song.name}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{song.artist}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => addSearchSong(song)}
                      className="px-2 py-1 text-[10px] font-black bg-green-500 text-white rounded-lg shrink-0"
                    >
                      添加
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-3xl p-6 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase">导入公开歌单链接</p>
            <input
              type="text"
              placeholder="粘贴歌单分享链接或 specialid"
              value={formData.musicPlaylistUrl || ''}
              onChange={(e) => handleUpdate('musicPlaylistUrl', e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl px-4 py-3 text-sm outline-none shadow-sm"
            />
            <button
              onClick={importPlaylist}
              disabled={playlistLoading}
              className="w-full py-3 bg-violet-500 text-white rounded-2xl text-xs font-black shadow-lg disabled:opacity-50"
            >
              {playlistLoading ? '导入中...' : '一键导入到博客列表'}
            </button>
          </div>

          <details className="bg-slate-100/30 dark:bg-slate-800/30 rounded-3xl p-4">
            <summary className="text-[10px] font-black text-slate-400 uppercase cursor-pointer select-none">
              高级：按 hash|album_id 手动添加
            </summary>
            <div className="mt-4 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="hash|album_id"
                  value={formData.newMusicId}
                  onChange={(e) => handleUpdate('newMusicId', e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-900 border-none rounded-2xl px-4 py-3 text-sm outline-none shadow-sm"
                />
                <button
                  onClick={queryMusic}
                  disabled={queryLoading}
                  className="px-4 py-3 bg-pink-500 text-white rounded-2xl text-xs font-black disabled:opacity-50"
                >
                  {queryLoading ? '...' : '校验'}
                </button>
              </div>
              <AnimatePresence>
                {queryResult && !queryResult.error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-green-500/30 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={queryResult.cover} alt="cover" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-green-600">校验通过</p>
                        <p className="text-xs font-bold line-clamp-1">{queryResult.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={confirmAddMusic}
                      className="px-3 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black shrink-0"
                    >
                      添加
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </details>

          <div className="bg-indigo-500/5 dark:bg-indigo-900/20 rounded-3xl p-6 space-y-3 border border-indigo-500/15">
            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-300 uppercase">
              博客播放列表 ({formData.cloudMusicIds.length})
            </p>
            {!kugouUser && formData.cloudMusicIds.length > 0 && (
              <p className="text-[10px] text-slate-500">登录后可查看歌曲详情；未登录时仅显示条目数量。</p>
            )}
            <div className="max-h-36 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {formData.cloudMusicIds.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">暂无歌曲，登录后从左侧歌单导入</p>
              ) : (
                formData.cloudMusicIds.map((id: string, index: number) => {
                  const detail = kugouUser ? musicDetails[id] : null;
                  const displayName =
                    detail && !detail.error
                      ? detail.name
                      : kugouUser
                        ? '解析中…'
                        : `歌曲 ${index + 1}`;
                  return (
                    <div
                      key={`${id}-${index}`}
                      className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-xl group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {detail?.cover && !detail.error ? (
                          <img src={detail.cover} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center text-[10px]">
                            💿
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold line-clamp-1 text-slate-800 dark:text-white">
                            {displayName}
                          </p>
                          {detail && !detail.error && (
                            <p className="text-[10px] text-slate-500 line-clamp-1">{detail.artist}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeSong(index)}
                        className="w-7 h-7 shrink-0 rounded-lg bg-red-500/10 text-red-500 opacity-60 group-hover:opacity-100 hover:bg-red-500 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => pushToQueue('酷狗歌单', 'cloudMusicIds', formData.cloudMusicIds)}
            className="w-full py-4 bg-indigo-500 text-white rounded-2xl text-sm font-black shadow-xl active:scale-95 transition-all"
          >
            暂存音乐修改
          </button>
        </div>
      </div>
    </motion.section>
  );
}
