"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
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

function SettingsContent() {
  const { operations, addOperation } = useOperations();
  const [activeTab, setActiveTab] = useState('profile');
  const { showToast } = useToast();

  const [formData, setFormData] = useState<any>({
    authorName: siteConfig.authorName || "",
    bio: siteConfig.bio || "",
    avatarUrl: siteConfig.avatarUrl || "",
    social: siteConfig.social || {},
    cloudMusicIds: [...(siteConfig.cloudMusicIds || [])],
    musicSearchKeyword: '',
    musicPlaylistUrl: '',
    newMusicId: '',
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

  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [musicDetails, setMusicDetails] = useState<Record<string, any>>({});
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  const [kugouUser, setKugouUser] = useState<{ nickname: string; pic: string; userid: string } | null>(null);
  const [kugouQrImage, setKugouQrImage] = useState('');
  const [kugouQrExpiresAt, setKugouQrExpiresAt] = useState(0);
  const [kugouQrCountdown, setKugouQrCountdown] = useState(0);
  const [kugouLoginStatus, setKugouLoginStatus] = useState('');
  const [kugouLoginLoading, setKugouLoginLoading] = useState(false);
  const [kugouPlaylists, setKugouPlaylists] = useState<any[]>([]);
  const [kugouPlaylistsLoading, setKugouPlaylistsLoading] = useState(false);
  const [kugouImportId, setKugouImportId] = useState('');
  const [kugouLoginTab, setKugouLoginTab] = useState<'qr' | 'phone'>('qr');
  const [kugouPhone, setKugouPhone] = useState('');
  const [kugouSmsCode, setKugouSmsCode] = useState('');
  const [kugouPhoneMid, setKugouPhoneMid] = useState('');
  const [kugouSmsCooldown, setKugouSmsCooldown] = useState(0);
  const [kugouPhoneLoading, setKugouPhoneLoading] = useState(false);
  const [kugouPhoneLoginEnabled, setKugouPhoneLoginEnabled] = useState(true);
  const [kugouOpenApiMode, setKugouOpenApiMode] = useState(false);
  const [kugouConfigHint, setKugouConfigHint] = useState('');
  const kugouPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const kugouSessionIdRef = useRef('');
  const kugouQrExpiresAtRef = useRef(0);

  const stopKugouPoll = useCallback(() => {
    if (kugouPollRef.current) {
      clearInterval(kugouPollRef.current);
      kugouPollRef.current = null;
    }
  }, []);

  const loadKugouPlaylists = useCallback(async (silent = false) => {
    setKugouPlaylistsLoading(true);
    try {
      const res = await fetch('/api/music/kugou/playlists', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.data?.length) {
        setKugouPlaylists(data.data);
        if (!silent) showToast(`已加载 ${data.data.length} 个歌单`, 'success');
      } else if (!data.success) {
        if (data.message?.includes('登录')) setKugouUser(null);
        setKugouPlaylists([]);
        if (!silent) showToast(data.message || '登录已过期，请重新扫码', 'warning');
      } else {
        setKugouPlaylists([]);
        if (!silent) showToast('账号下暂无歌单', 'warning');
      }
    } catch {
      if (!silent) showToast('加载歌单失败', 'error');
    }
    setKugouPlaylistsLoading(false);
  }, [showToast]);

  const fetchKugouSession = useCallback(async () => {
    try {
      const res = await fetch('/api/music/kugou/session', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.data) {
        setKugouUser(data.data);
        await loadKugouPlaylists(true);
        return true;
      }
      setKugouUser(null);
      setKugouPlaylists([]);
      return false;
    } catch {
      return false;
    }
  }, [loadKugouPlaylists]);

  const handleKugouQrExpired = useCallback(() => {
    stopKugouPoll();
    setKugouLoginLoading(false);
    setKugouQrImage('');
    setKugouQrExpiresAt(0);
    kugouQrExpiresAtRef.current = 0;
    setKugouQrCountdown(0);
    setKugouLoginStatus('二维码已过期（约 2 分钟有效），请点击「刷新二维码」');
  }, [stopKugouPoll]);

  useEffect(() => {
    fetchKugouSession();
    fetch('/api/music/kugou/config', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setKugouOpenApiMode(!!data.data.openapi);
          setKugouPhoneLoginEnabled(!!data.data.phoneLoginEnabled);
          setKugouConfigHint(data.data.configHint || '');
          setKugouLoginTab('qr');
        }
      })
      .catch(() => {});
    return () => stopKugouPoll();
  }, [fetchKugouSession, stopKugouPoll]);

  useEffect(() => {
    if (kugouSmsCooldown <= 0) return;
    const timer = setInterval(() => {
      setKugouSmsCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [kugouSmsCooldown]);

  useEffect(() => {
    if (!kugouQrExpiresAt || kugouUser) return;

    const tick = () => {
      const left = kugouQrExpiresAt - Date.now();
      if (left <= 0) {
        handleKugouQrExpired();
        return;
      }
      setKugouQrCountdown(Math.ceil(left / 1000));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [kugouQrExpiresAt, kugouUser, handleKugouQrExpired]);

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
      return data.success ? data.data : { error: true, id, name: "查询失败或无版权" };
    } catch (error) {
      return { error: true, id, name: "后端通信通道断开" };
    }
  };

  useEffect(() => {
    if (!kugouUser) return;
    const loadInitialMusicDetails = async () => {
      const details: Record<string, any> = { ...musicDetails };
      let hasUpdate = false;
      for (const id of formData.cloudMusicIds || []) {
        if (!details[id]) {
          const info = await fetchMusicDetail(id);
          if (info && !info.error) {
            details[id] = info;
            hasUpdate = true;
          }
        }
      }
      if (hasUpdate) setMusicDetails(details);
    };
    if (formData.cloudMusicIds?.length > 0) {
      loadInitialMusicDetails();
    }
  }, [formData.cloudMusicIds, kugouUser]);

  const queryMusic = async () => {
    if (!formData.newMusicId) {
      showToast("ID不能为空哦", "warning");
      return;
    }
    setQueryLoading(true);
    setQueryResult(null);

    const info = await fetchMusicDetail(formData.newMusicId);
    if (info && !info.error) {
      setQueryResult(info);
      showToast("获取成功！", "success");
    } else {
      showToast(info?.name || "未找到该歌曲", "error");
    }
    setQueryLoading(false);
  };

  const removeSong = (index: number) => {
    const newList = [...formData.cloudMusicIds];
    newList.splice(index, 1);
    handleUpdate('cloudMusicIds', newList);
    showToast("已移除一首歌曲", "success");
  };

  const addSongToList = (song: { id: string; name: string; artist?: string; cover?: string }) => {
    const targetId = String(song.id);
    const exists = formData.cloudMusicIds.some((id: string | number) => String(id) === targetId);
    if (exists) {
      showToast(`《${song.name}》已在列表中`, 'warning');
      return false;
    }
    handleUpdate('cloudMusicIds', [...formData.cloudMusicIds, targetId]);
    setMusicDetails((prev) => ({
      ...prev,
      [targetId]: { id: targetId, name: song.name, artist: song.artist, cover: song.cover },
    }));
    showToast(`已添加《${song.name}》`, 'success');
    return true;
  };

  const confirmAddMusic = () => {
    if (!queryResult) return;
    if (addSongToList(queryResult)) {
      setQueryResult(null);
      handleUpdate('newMusicId', '');
    }
  };

  const searchByName = async () => {
    const keyword = formData.musicSearchKeyword?.trim();
    if (!keyword) {
      showToast('请输入歌名或歌手', 'warning');
      return;
    }
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(keyword)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.data?.length) {
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

  const addSearchSong = (song: any) => {
    addSongToList(song);
  };

  const startKugouLogin = async () => {
    stopKugouPoll();
    setKugouLoginLoading(true);
    setKugouLoginStatus('正在生成二维码…');
    setKugouQrImage('');
    setKugouQrExpiresAt(0);
    setKugouQrCountdown(0);
    try {
      const res = await fetch('/api/music/kugou/login/qr', { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        showToast(data.message || '获取二维码失败', 'error');
        setKugouLoginLoading(false);
        setKugouLoginStatus('');
        return;
      }
      kugouSessionIdRef.current = data.data.sessionId;
      setKugouQrImage(data.data.qrImageUrl);
      const expiresAt = data.data.expiresAt || Date.now() + 115000;
      kugouQrExpiresAtRef.current = expiresAt;
      setKugouQrExpiresAt(expiresAt);
      const ttl = data.data.ttlSeconds || 115;
      setKugouQrCountdown(ttl);
      setKugouLoginStatus(`请使用酷狗音乐 App 扫码（${ttl} 秒内有效）`);

      kugouPollRef.current = setInterval(async () => {
        const expiresAt = kugouQrExpiresAtRef.current;
        if (expiresAt && Date.now() >= expiresAt) {
          handleKugouQrExpired();
          showToast('二维码已过期，请刷新', 'warning');
          return;
        }
        try {
          const pollRes = await fetch(
            `/api/music/kugou/login/poll?sessionId=${encodeURIComponent(kugouSessionIdRef.current)}`,
            { cache: 'no-store' }
          );
          const pollData = await pollRes.json();
          if (!pollData.success) return;

          const st = pollData.data?.status;
          if (st === 'waiting' || st === 'scanned') {
            const left = expiresAt
              ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
              : 0;
            const hint =
              st === 'scanned'
                ? '已扫码，请在手机上确认'
                : '请使用酷狗音乐 App 扫码';
            setKugouLoginStatus(left > 0 ? `${hint}（剩余 ${left}s）` : pollData.data?.message);
          } else if (pollData.data?.message && st !== 'success') {
            setKugouLoginStatus(pollData.data.message);
          }

          if (st === 'success') {
            stopKugouPoll();
            setKugouLoginLoading(false);
            setKugouQrImage('');
            setKugouQrExpiresAt(0);
            kugouQrExpiresAtRef.current = 0;
            setKugouQrCountdown(0);
            setKugouUser(pollData.data.user);
            showToast('酷狗登录成功', 'success');
            loadKugouPlaylists(true);
          } else if (st === 'expired') {
            handleKugouQrExpired();
            setKugouLoginStatus(pollData.data.message || '二维码已失效，请重新获取后再扫码');
            showToast(pollData.data.message || '请重新获取二维码', 'warning');
          } else if (st === 'error') {
            setKugouLoginStatus(pollData.data.message || '登录异常，可尝试刷新二维码');
            showToast(pollData.data.message || '登录失败', 'error');
          }
        } catch {
          /* 轮询静默失败，下次重试 */
        }
      }, 2000);
    } catch {
      showToast('无法连接登录服务', 'error');
      setKugouLoginLoading(false);
      setKugouLoginStatus('');
    }
  };

  const sendKugouSms = async () => {
    const mobile = kugouPhone.trim();
    if (!mobile) {
      showToast('请输入手机号', 'warning');
      return;
    }
    setKugouPhoneLoading(true);
    try {
      const res = await fetch('/api/music/kugou/login/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.message || '发送失败', 'error');
      } else {
        setKugouPhoneMid(data.data?.mid || '');
        setKugouSmsCooldown(60);
        showToast(data.data?.message || '验证码已发送', 'success');
      }
    } catch {
      showToast('发送验证码失败', 'error');
    }
    setKugouPhoneLoading(false);
  };

  const loginKugouByPhone = async () => {
    const mobile = kugouPhone.trim();
    const code = kugouSmsCode.trim();
    if (!mobile || !code) {
      showToast('请填写手机号和验证码', 'warning');
      return;
    }
    setKugouPhoneLoading(true);
    try {
      const res = await fetch('/api/music/kugou/login/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, code, mid: kugouPhoneMid }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.message || '登录失败', 'error');
      } else {
        stopKugouPoll();
        setKugouUser(data.data.user);
        setKugouSmsCode('');
        setKugouLoginStatus('');
        setKugouLoginLoading(false);
        showToast('酷狗登录成功', 'success');
        loadKugouPlaylists(true);
      }
    } catch {
      showToast('登录请求失败', 'error');
    }
    setKugouPhoneLoading(false);
  };

  const logoutKugou = async () => {
    stopKugouPoll();
    try {
      await fetch('/api/music/kugou/session', { method: 'DELETE' });
    } catch {
      /* ignore */
    }
    setKugouUser(null);
    setKugouQrImage('');
    setKugouQrExpiresAt(0);
    kugouQrExpiresAtRef.current = 0;
    setKugouQrCountdown(0);
    setKugouPlaylists([]);
    setKugouLoginStatus('');
    setKugouLoginLoading(false);
    setKugouPhone('');
    setKugouSmsCode('');
    setKugouPhoneMid('');
    showToast('已退出酷狗登录', 'success');
  };

  const importKugouPlaylist = async (id: string, name: string) => {
    setKugouImportId(id);
    try {
      const res = await fetch(`/api/music/kugou/playlist?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const raw = await res.text();
      let data: { success?: boolean; message?: string; data?: { songs?: unknown[] } };
      try {
        data = JSON.parse(raw);
      } catch {
        showToast('导入接口异常，请重建 blog-manager 容器后重试', 'error');
        setKugouImportId('');
        return;
      }
      if (!data.success || !data.data?.songs?.length) {
        showToast(data.message || `「${name}」为空或无法读取`, 'error');
        setKugouImportId('');
        return;
      }
      let added = 0;
      const nextDetails = { ...musicDetails };
      const nextIds = [...formData.cloudMusicIds];
      for (const song of data.data.songs) {
        const targetId = String(song.id);
        if (nextIds.some((sid) => String(sid) === targetId)) continue;
        nextIds.push(targetId);
        nextDetails[targetId] = { id: targetId, name: song.name, artist: song.artist, cover: song.cover };
        added += 1;
      }
      handleUpdate('cloudMusicIds', nextIds);
      setMusicDetails(nextDetails);
      showToast(`从「${name}」导入 ${added} 首（共 ${data.data.songs.length} 首）`, 'success');
    } catch {
      showToast('导入失败', 'error');
    }
    setKugouImportId('');
  };

  const importPlaylist = async () => {
    const url = formData.musicPlaylistUrl?.trim();
    if (!url) {
      showToast('请粘贴歌单分享链接', 'warning');
      return;
    }
    setPlaylistLoading(true);
    try {
      const res = await fetch(`/api/music/playlist?url=${encodeURIComponent(url)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!data.success || !data.data?.songs?.length) {
        showToast(data.message || '歌单为空或无法解析', 'error');
        setPlaylistLoading(false);
        return;
      }
      let added = 0;
      const nextDetails = { ...musicDetails };
      const nextIds = [...formData.cloudMusicIds];
      for (const song of data.data.songs) {
        const targetId = String(song.id);
        if (nextIds.some((id) => String(id) === targetId)) continue;
        nextIds.push(targetId);
        nextDetails[targetId] = { id: targetId, name: song.name, artist: song.artist, cover: song.cover };
        added += 1;
      }
      handleUpdate('cloudMusicIds', nextIds);
      setMusicDetails(nextDetails);
      showToast(`从「${data.data.title}」导入 ${added} 首（共 ${data.data.songs.length} 首）`, 'success');
    } catch {
      showToast('导入歌单失败', 'error');
    }
    setPlaylistLoading(false);
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
                  musicDetails={musicDetails}
                  queryMusic={queryMusic}
                  queryLoading={queryLoading}
                  queryResult={queryResult}
                  confirmAddMusic={confirmAddMusic}
                  removeSong={removeSong}
                  searchByName={searchByName}
                  searchLoading={searchLoading}
                  searchResults={searchResults}
                  addSearchSong={addSearchSong}
                  importPlaylist={importPlaylist}
                  playlistLoading={playlistLoading}
                  kugouUser={kugouUser}
                  kugouQrImage={kugouQrImage}
                  kugouLoginStatus={kugouLoginStatus}
                  kugouQrCountdown={kugouQrCountdown}
                  kugouLoginLoading={kugouLoginLoading}
                  startKugouLogin={startKugouLogin}
                  logoutKugou={logoutKugou}
                  kugouPlaylists={kugouPlaylists}
                  kugouPlaylistsLoading={kugouPlaylistsLoading}
                  loadKugouPlaylists={() => loadKugouPlaylists()}
                  importKugouPlaylist={importKugouPlaylist}
                  kugouImportId={kugouImportId}
                  kugouLoginTab={kugouLoginTab}
                  setKugouLoginTab={setKugouLoginTab}
                  kugouPhoneLoginEnabled={kugouPhoneLoginEnabled}
                  kugouOpenApiMode={kugouOpenApiMode}
                  kugouConfigHint={kugouConfigHint}
                  kugouPhone={kugouPhone}
                  setKugouPhone={setKugouPhone}
                  kugouSmsCode={kugouSmsCode}
                  setKugouSmsCode={setKugouSmsCode}
                  kugouSmsCooldown={kugouSmsCooldown}
                  kugouPhoneLoading={kugouPhoneLoading}
                  sendKugouSms={sendKugouSms}
                  loginKugouByPhone={loginKugouByPhone}
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
      <SettingsContent />
    </ToastProvider>
  );
}