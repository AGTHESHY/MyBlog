"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { NeteaseAuthStatus } from '../../lib/netease-open-api';
import { motion, AnimatePresence } from 'framer-motion';
import { useOperations } from '../../context/OperationContext';
import { siteConfig } from '../../siteConfig';
import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import { ToastProvider, useToast } from '../../components/ToastProvider';

import ProfileSection from '../../components/settings/ProfileSection';
import BackgroundSection from '../../components/settings/BackgroundSection';
import MusicSection from '../../components/settings/MusicSection';
import GallerySection from '../../components/settings/GallerySection';
import RepoSection from '../../components/settings/RepoSection';
import CommentSection from '../../components/settings/CommentSection';
import DanmakuSection from '../../components/settings/DanmakuSection';
import FooterSection from '../../components/settings/FooterSection';
// 👇 🌟 引入刚写的 AI 配置组件
import AICatSection from '../../components/settings/AICatSection';
import {
  describeInvalidMusicId,
  filterValidNeteaseSongIds,
  normalizeNeteaseSongId,
  type NeteaseSongMeta,
} from '../../lib/netease-music-shared';

function SettingsContent() {
  const { operations, addOperation } = useOperations();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const { showToast } = useToast();

  const [formData, setFormData] = useState<any>({
    authorName: siteConfig.authorName || "",
    bio: siteConfig.bio || "",
    avatarUrl: siteConfig.avatarUrl || "",
    social: siteConfig.social || {},
    cloudMusicIds: [...(siteConfig.cloudMusicIds || [])],
    musicSearchQuery: '',
    bgImages: [...(siteConfig.bgImages || [])],
    gitalkConfig: siteConfig.gitalkConfig || {
      clientID: '',
      clientSecret: '',
      repo: '',
      owner: '',
      admin: []
    },
    danmakuList: [...(siteConfig.danmakuList || [])],
    buildDate: siteConfig.buildDate || "2026-03-23T00:00:00",
    icpConfig: siteConfig.icpConfig || { name: "", link: "" },
    footerBadges: [...(siteConfig.footerBadges || [])],
    // 👇 🌟 初始化小猫 AI 配置数据
    geminiConfig: siteConfig.geminiConfig || {
      modelId: 'gemini-2.5-flash-lite',
      systemPrompt: '',
      maxOutputTokens: 150,
      temperature: 0.85
    }
  });

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<NeteaseSongMeta[]>([]);
  const [musicDetails, setMusicDetails] = useState<Record<string, any>>({});
  const [configLoaded, setConfigLoaded] = useState(false);
  const musicLoadGenRef = useRef(0);
  const musicDetailsRef = useRef(musicDetails);
  musicDetailsRef.current = musicDetails;
  const [neteaseAuth, setNeteaseAuth] = useState<NeteaseAuthStatus | null>(null);
  const [neteaseAuthLoading, setNeteaseAuthLoading] = useState(false);
  const [neteaseShowQr, setNeteaseShowQr] = useState(false);
  const [neteaseQrImage, setNeteaseQrImage] = useState('');
  const [neteaseQrStatus, setNeteaseQrStatus] = useState('');
  const [neteaseQrCountdown, setNeteaseQrCountdown] = useState(0);
  const neteasePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const neteaseSessionRef = useRef({ sessionId: '', unikey: '', expiresAt: 0 });

  const stopNeteasePoll = useCallback(() => {
    if (neteasePollRef.current) {
      clearInterval(neteasePollRef.current);
      neteasePollRef.current = null;
    }
  }, []);

  const fetchNeteaseAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/music/netease/auth/status', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setNeteaseAuth(data.data);
        return;
      }
      setNeteaseAuth({
        configured: false,
        loggedIn: false,
        tokenKind: 'none',
        message: data.message || '无法读取网易云配置状态',
      });
    } catch {
      setNeteaseAuth({
        configured: false,
        loggedIn: false,
        tokenKind: 'none',
        message: '无法连接管理端 API，请确认 blog-manager 容器已启动',
      });
    }
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);

    const netease = searchParams.get('netease');
    if (netease === 'ok') {
      setActiveTab('music');
      showToast('网易云用户登录成功，已启用更高播放权限', 'success');
      fetchNeteaseAuthStatus();
    } else if (netease === 'denied') {
      showToast('已取消网易云授权', 'warning');
    } else if (netease === 'fail') {
      const msg = searchParams.get('msg');
      showToast(msg ? decodeURIComponent(msg) : '网易云登录失败', 'error');
    } else if (netease === 'state_invalid') {
      showToast('登录状态已过期，请重新点击登录', 'warning');
    }
  }, [searchParams, showToast, fetchNeteaseAuthStatus]);

  useEffect(() => {
    if (activeTab === 'music') fetchNeteaseAuthStatus();
  }, [activeTab, fetchNeteaseAuthStatus]);

  useEffect(() => {
    const fetchRealConfig = async () => {
      try {
        const res = await fetch(`/api/config/get`, { cache: 'no-store' });
        const data = await res.json();

        if (data.success && data.data) {
          console.log("✅ 成功从后端拉取到真实配置:", data.data);
          setFormData((prev: any) => ({
            ...prev,
            ...data.data,
            social: { ...(prev.social || {}), ...(data.data.social || {}) },
            gitalkConfig: { ...(prev.gitalkConfig || {}), ...(data.data.gitalkConfig || {}) },
            danmakuList: data.data.danmakuList ? [...data.data.danmakuList] : prev.danmakuList,
            buildDate: data.data.buildDate || prev.buildDate,
            icpConfig: data.data.icpConfig || prev.icpConfig,
            footerBadges: data.data.footerBadges ? [...data.data.footerBadges] : prev.footerBadges,
            // 👇 🌟 合并后端发来的小猫配置
            geminiConfig: { ...(prev.geminiConfig || {}), ...(data.data.geminiConfig || {}) }
          }));
        } else {
          console.error("❌ 后端返回失败:", data.message);
          showToast("读取后端配置失败，当前显示为本地静态数据", "warning");
        }
      } catch (error) {
        console.error("❌ 请求后端配置通道断开:", error);
        showToast("无法连接到 Python 后端服务", "error");
      } finally {
        setConfigLoaded(true);
      }
    };

    fetchRealConfig();
  }, []);

  const handleUpdate = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const fetchMusicDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/music/query/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json();
      return data.success ? data.data : { error: true, id, name: '查询失败或无版权' };
    } catch {
      return { error: true, id, name: '查询通道断开' };
    }
  };

  const persistCloudMusicIds = async (ids: string[]) => {
    const cleaned = filterValidNeteaseSongIds(ids);
    const res = await fetch('/api/config/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: { cloudMusicIds: cleaned } }),
    });
    const data = await res.json();
    return { ok: !!data.success, cleaned, message: data.message as string | undefined };
  };

  const saveCloudMusicIds = async () => {
    const result = await persistCloudMusicIds(formData.cloudMusicIds || []);
    if (result.cleaned.length !== (formData.cloudMusicIds?.length || 0)) {
      handleUpdate('cloudMusicIds', result.cleaned);
      showToast('已自动移除无效的酷狗/非数字 ID', 'warning');
    }
    if (!result.ok) {
      showToast(result.message || '写入数据库失败', 'error');
      return;
    }
    showToast('播放列表已保存，前台音乐页将自动同步', 'success');
  };

  useEffect(() => {
    if (!configLoaded) return;

    const gen = ++musicLoadGenRef.current;
    const ids = (formData.cloudMusicIds || []).map(String);
    const idSet = new Set(ids);

    setMusicDetails((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const key of Object.keys(next)) {
        if (!idSet.has(key)) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    if (ids.length === 0) return;

    const loadMusicDetails = async () => {
      for (const rawId of ids) {
        if (musicLoadGenRef.current !== gen) return;
        if (musicDetailsRef.current[rawId]?.name) continue;

        const normalized = normalizeNeteaseSongId(rawId);
        if (!normalized) {
          setMusicDetails((prev) =>
            prev[rawId]
              ? prev
              : { ...prev, [rawId]: { error: true, id: rawId, name: describeInvalidMusicId(rawId) } }
          );
          continue;
        }

        const info = await fetchMusicDetail(normalized);
        if (musicLoadGenRef.current !== gen) return;
        setMusicDetails((prev) => ({
          ...prev,
          [rawId]: info || { error: true, id: rawId, name: '查询失败或无版权' },
        }));
      }
    };

    loadMusicDetails();
  }, [formData.cloudMusicIds, configLoaded]);

  const searchMusic = async () => {
    const q = String(formData.musicSearchQuery || '').trim();
    if (!q) {
      showToast('请输入歌名或歌手', 'warning');
      return;
    }
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}&limit=12`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSearchResults(data.data);
        showToast(`找到 ${data.data.length} 首相关歌曲`, 'success');
      } else {
        showToast(data.message || '未找到相关歌曲', 'error');
      }
    } catch {
      showToast('搜索请求失败', 'error');
    }
    setSearchLoading(false);
  };

  const startNeteaseQrLogin = useCallback(async () => {
    stopNeteasePoll();
    setNeteaseAuthLoading(true);
    setNeteaseShowQr(true);
    setNeteaseQrImage('');
    setNeteaseQrStatus('正在生成二维码…');
    try {
      const res = await fetch('/api/music/netease/auth/qr', { method: 'POST', cache: 'no-store' });
      const data = await res.json();
      if (!data.success || !data.data?.unikey) {
        showToast(data.message || '无法生成二维码', 'error');
        setNeteaseShowQr(false);
        return;
      }

      const { sessionId, unikey, qrImageUrl, expiresAt } = data.data;
      neteaseSessionRef.current = { sessionId, unikey, expiresAt };
      setNeteaseQrImage(qrImageUrl || '');
      setNeteaseQrStatus('请使用网易云音乐 App 扫码');
      setNeteaseQrCountdown(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));

      neteasePollRef.current = setInterval(async () => {
        const { sessionId: sid, unikey: key, expiresAt: exp } = neteaseSessionRef.current;
        if (!sid || !key) return;

        if (exp && exp < Date.now()) {
          stopNeteasePoll();
          setNeteaseQrImage('');
          setNeteaseQrCountdown(0);
          setNeteaseQrStatus('二维码已过期（约 2 分钟），请点击「刷新二维码」');
          return;
        }
        setNeteaseQrCountdown(Math.max(0, Math.ceil((exp - Date.now()) / 1000)));

        try {
          const pollRes = await fetch('/api/music/netease/auth/qr/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: sid, unikey: key }),
            cache: 'no-store',
          });
          const poll = await pollRes.json();
          if (!poll.success) {
            stopNeteasePoll();
            setNeteaseQrStatus(poll.message || '轮询失败');
            return;
          }
          const st = poll.data?.status as string;
          if (poll.data?.message) setNeteaseQrStatus(poll.data.message);
          if (st === 'success') {
            stopNeteasePoll();
            setNeteaseShowQr(false);
            setNeteaseQrImage('');
            showToast('网易云扫码登录成功', 'success');
            await fetchNeteaseAuthStatus();
          } else if (st === 'expired') {
            stopNeteasePoll();
            setNeteaseQrImage('');
            setNeteaseQrCountdown(0);
          } else if (st === 'error') {
            stopNeteasePoll();
            showToast(poll.data?.message || '登录失败', 'error');
          }
        } catch {
          // 单次轮询失败忽略，下次继续
        }
      }, 2000);
    } catch {
      showToast('二维码请求失败', 'error');
      setNeteaseShowQr(false);
    } finally {
      setNeteaseAuthLoading(false);
    }
  }, [stopNeteasePoll, showToast, fetchNeteaseAuthStatus]);

  const cancelNeteaseQr = useCallback(() => {
    stopNeteasePoll();
    setNeteaseShowQr(false);
    setNeteaseQrImage('');
    setNeteaseQrStatus('');
    setNeteaseQrCountdown(0);
    neteaseSessionRef.current = { sessionId: '', unikey: '', expiresAt: 0 };
  }, [stopNeteasePoll]);

  useEffect(() => () => stopNeteasePoll(), [stopNeteasePoll]);

  const logoutNetease = async () => {
    setNeteaseAuthLoading(true);
    try {
      const res = await fetch('/api/music/netease/auth/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('已退出网易云登录', 'success');
        await fetchNeteaseAuthStatus();
      }
    } catch {
      showToast('退出失败', 'error');
    }
    setNeteaseAuthLoading(false);
  };

  const addSongToPlaylist = async (song: NeteaseSongMeta) => {
    const targetId = String(song.id);
    const exists = formData.cloudMusicIds.some((id: string | number) => String(id) === targetId);
    if (exists) {
      showToast(`《${song.name}》已在列表中`, 'warning');
      return;
    }
    const newList = [...formData.cloudMusicIds, targetId];
    handleUpdate('cloudMusicIds', newList);
    setMusicDetails((prev) => ({ ...prev, [targetId]: song }));
    const result = await persistCloudMusicIds(newList);
    if (!result.ok) {
      showToast(result.message || '添加成功但同步数据库失败', 'error');
      return;
    }
    showToast(`已添加《${song.name}》并同步到音乐页`, 'success');
  };

  const removeSong = async (index: number) => {
    const newList = [...formData.cloudMusicIds];
    const removedId = String(newList[index] ?? '');
    newList.splice(index, 1);
    handleUpdate('cloudMusicIds', newList);
    if (removedId) {
      setMusicDetails((prev) => {
        const next = { ...prev };
        delete next[removedId];
        return next;
      });
    }
    const result = await persistCloudMusicIds(newList);
    showToast(
      result.ok ? '已移除并已同步到音乐页' : result.message || '已移除，但同步数据库失败',
      result.ok ? 'success' : 'error'
    );
  };

  const pushToQueue = (label: string, key?: string, value?: any) => {
    addOperation({
      id: Date.now().toString(),
      type: 'CONFIG',
      label: `配置暂存：${label}`,
      description: `修改了系统的 ${label}，等待同步至 my-blog`,
      timestamp: new Date().toLocaleTimeString().slice(0, 5),
      payload: formData,
      key: key,
      value: value
    });
    showToast(`🎉 【${label}】已加入右上角操作队列！`, "success");
  };

  // 👇 🌟 在菜单里增加 AI 猫咪入口
  const menuItems = [
    { id: 'profile', name: '个人名片设置', icon: '👤' },
    { id: 'background', name: '视觉背景配置', icon: '🌌' },
    { id: 'music', name: '音乐播放设置', icon: '🎵' },
    { id: 'gallery', name: '图库配置管理', icon: '🖼️' },
    { id: 'footer', name: '首页底部设置', icon: '🧩' },
    { id: 'danmaku', name: '全站弹幕设置', icon: '⚡' },
    { id: 'comment', name: '评论系统配置', icon: '💬' },
    { id: 'aicat', name: 'AI 煤球配置', icon: '🐾' }, // 👈 新增的小猫设置
    { id: 'repo', name: '项目仓库设置', icon: '🚀' },
  ];

  return (
    <div className="min-h-screen relative pb-10">
      <Navbar />

      <PageTransition>
        <main className="w-[95%] max-w-7xl mx-auto mt-24 flex flex-col md:flex-row gap-8 items-start relative z-10">

          <div className="w-full md:w-72 shrink-0 flex flex-col gap-4">
            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/50 dark:border-slate-800/50 rounded-3xl p-4 shadow-xl">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-4 ml-2 tracking-widest">系统管理维度</p>
              <nav className="flex flex-col gap-2">
                {menuItems.map((item) => (
                  <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-bold text-sm ${activeTab === item.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 translate-x-1' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
                    <span>{item.icon}</span>{item.name}
                  </button>
                ))}
              </nav>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 mt-4">
              <p className="text-xs font-black text-amber-600 dark:text-amber-400 mb-2">🔄 数据中枢操作</p>
              <button className="w-full py-2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold hover:bg-amber-500 hover:text-white transition-all text-left px-4 flex justify-between">
                <span>拉取 my-blog 数据</span><span>📥</span>
              </button>
            </div>
          </div>

          <div className="flex-1 w-full">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && <ProfileSection key="profile" formData={formData} handleUpdate={handleUpdate} pushToQueue={pushToQueue} />}
              {activeTab === 'background' && <BackgroundSection key="background" formData={formData} handleUpdate={handleUpdate} pushToQueue={pushToQueue} />}
              {activeTab === 'music' && (
                <MusicSection
                  key="music"
                  formData={formData}
                  handleUpdate={handleUpdate}
                  pushToQueue={pushToQueue}
                  onSaveCloudMusicIds={saveCloudMusicIds}
                  musicDetails={musicDetails}
                  searchMusic={searchMusic}
                  searchLoading={searchLoading}
                  searchResults={searchResults}
                  addSongToPlaylist={addSongToPlaylist}
                  removeSong={removeSong}
                  cloudMusicIds={formData.cloudMusicIds || []}
                  neteaseAuth={neteaseAuth}
                  neteaseAuthLoading={neteaseAuthLoading}
                  neteaseShowQr={neteaseShowQr}
                  neteaseQrImage={neteaseQrImage}
                  neteaseQrStatus={neteaseQrStatus}
                  neteaseQrCountdown={neteaseQrCountdown}
                  onNeteaseLogin={startNeteaseQrLogin}
                  onNeteaseRefreshQr={startNeteaseQrLogin}
                  onNeteaseCancelQr={cancelNeteaseQr}
                  onNeteaseLogout={logoutNetease}
                />
              )}
              {activeTab === 'gallery' && <GallerySection key="gallery" formData={formData} handleUpdate={handleUpdate} pushToQueue={pushToQueue} />}
              {activeTab === 'footer' && <FooterSection key="footer" formData={formData} handleUpdate={handleUpdate} pushToQueue={pushToQueue} />}
              {activeTab === 'danmaku' && <DanmakuSection key="danmaku" formData={formData} handleUpdate={handleUpdate} pushToQueue={pushToQueue} />}
              {activeTab === 'comment' && <CommentSection key="comment" formData={formData} handleUpdate={handleUpdate} pushToQueue={pushToQueue} />}
              {/* 👇 🌟 挂载 AI 猫咪面板 */}
              {activeTab === 'aicat' && <AICatSection key="aicat" formData={formData} handleUpdate={handleUpdate} pushToQueue={pushToQueue} />}

              {activeTab === 'repo' && <RepoSection key="repo" />}
            </AnimatePresence>
          </div>

        </main>
      </PageTransition>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ToastProvider>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">加载设置…</div>
        }
      >
        <SettingsContent />
      </Suspense>
    </ToastProvider>
  );
}