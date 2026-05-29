"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PANEL_LEAVE_DELAY_MS = 450;

export default function CyberCat() {
  const [isPetted, setIsPetted] = useState(false);
  const [speech, setSpeech] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const chatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cancelScheduledClose = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const scheduleClosePanel = () => {
    cancelScheduledClose();
    if (showInput || isThinking) return;
    leaveTimerRef.current = setTimeout(() => {
      setMenuOpen(false);
      setShowInput(false);
    }, PANEL_LEAVE_DELAY_MS);
  };

  const speak = (text: string, duration = 6000) => {
    setSpeech(text);
    if (chatTimeoutRef.current) clearTimeout(chatTimeoutRef.current);
    chatTimeoutRef.current = setTimeout(() => {
      setSpeech(null);
    }, duration);
  };

  const handleCatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    cancelScheduledClose();
    setMenuOpen((open) => {
      const next = !open;
      if (!next) setShowInput(false);
      return next;
    });
  };

  const openChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    cancelScheduledClose();
    setMenuOpen(true);
    setShowInput(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleCatDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPetted) return;
    setIsPetted(true);
    speak('呼噜噜... 摸得本喵很舒服喵~', 2000);
    setTimeout(() => setIsPetted(false), 2000);
  };

  const handleFeed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    cancelScheduledClose();
    if (isThinking) return;
    setIsThinking(true);
    speak('嗷呜！真好吃喵！本喵吃饱了要说两句...', 6000);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '我刚刚喂了你一条美味的小鱼干！你有什么表示？' }),
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      speak(data.reply, 8000);
    } catch {
      speak('吧唧吧唧... 鱼干好吃，但本喵卡壳了喵...', 4000);
    } finally {
      setIsThinking(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isThinking) return;
    const userMessage = inputValue;
    setInputValue('');
    setIsThinking(true);
    speak('让本喵想想喵...', 10000);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      speak(data.reply, 8000);
    } catch {
      speak('铲屎官的网线被老鼠咬断了吧？喵！', 4000);
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    const randomBarks = [
      '喵呜~ 今天天气真不错喵~',
      '好困哦，想睡觉喵...',
      '铲屎官，快去敲代码！',
      '我的小鱼干藏哪里去了？',
      '怎么没人理本喵...',
    ];
    const randomTalkInterval = setInterval(() => {
      if (!speech && !showInput && !isThinking && !menuOpen && Math.random() > 0.8) {
        const randomMsg = randomBarks[Math.floor(Math.random() * randomBarks.length)];
        speak(randomMsg, 4000);
      }
    }, 20000);
    return () => clearInterval(randomTalkInterval);
  }, [speech, showInput, isThinking, menuOpen]);

  useEffect(() => () => cancelScheduledClose(), []);

  return (
    <motion.div
      drag
      dragMomentum={false}
      whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
      className="fixed bottom-6 right-6 z-[9998] pointer-events-none"
      style={{ touchAction: 'none' }}
    >
      <div
        className={`relative flex flex-col items-center pointer-events-auto rounded-3xl transition-[padding] ${
          menuOpen ? 'p-2 -m-2' : ''
        }`}
        onMouseEnter={cancelScheduledClose}
        onMouseLeave={scheduleClosePanel}
      >
        {/* 聊天气泡 */}
        <div className="relative w-full flex justify-center mb-2 min-h-[8px]">
          <AnimatePresence>
            {speech && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.92, transition: { duration: 0.2 } }}
                className="relative bg-white dark:bg-slate-800 text-slate-700 dark:text-gray-200 px-4 py-3 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 text-sm max-w-[220px] break-words text-center leading-relaxed"
              >
                {speech}
                <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-800 border-b border-r border-gray-100 dark:border-slate-700 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="relative flex items-center gap-2">
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, x: 12, scale: 0.85 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 10, scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  className="flex flex-col gap-2 mr-1"
                >
                  <button
                    type="button"
                    onClick={openChat}
                    className={`bg-white/95 dark:bg-slate-700/95 p-2.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform border backdrop-blur-sm ${
                      showInput
                        ? 'border-blue-400 text-blue-600 ring-2 ring-blue-400/40'
                        : 'border-gray-100 dark:border-slate-600 text-blue-500'
                    }`}
                    title="聊天"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleFeed}
                    disabled={isThinking}
                    className={`bg-white/95 dark:bg-slate-700/95 p-2.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform border border-gray-100 dark:border-slate-600 backdrop-blur-sm ${isThinking ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="喂小鱼干"
                  >
                    <span className="text-xl leading-none">🐟</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className="w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] relative cursor-pointer shrink-0"
              onClick={handleCatClick}
              onDoubleClick={handleCatDoubleClick}
              title="单击打开菜单，双击撸猫"
            >
              <style>{`
                .cat-sprite {
                  width: 100%; height: 100%;
                  background-image: url('/siamese-cat.png');
                  background-size: 300% 300%;
                  background-repeat: no-repeat;
                  image-rendering: pixelated;
                }
                .cat-idle { animation: idle-frames 1.2s infinite; background-position-y: 0%; }
                .cat-petted { animation: pet-frames 0.8s infinite; background-position-y: 50%; }
                .cat-thinking { animation: idle-frames 0.6s infinite; background-position-y: 0%; }
                @keyframes idle-frames {
                  0%, 33.32% { background-position-x: 0%; }
                  33.33%, 66.65% { background-position-x: 50%; }
                  66.66%, 100% { background-position-x: 100%; }
                }
                @keyframes pet-frames {
                  0%, 49.99% { background-position-x: 0%; }
                  50%, 100% { background-position-x: 50%; }
                }
              `}</style>
              <div className={`cat-sprite drop-shadow-2xl ${isPetted ? 'cat-petted' : isThinking ? 'cat-thinking' : 'cat-idle'}`} />
            </div>
          </div>

          {/* 聊天框：文档流布局，与煤球同一 hover 区域 */}
          <AnimatePresence>
            {showInput && menuOpen && (
              <motion.form
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                onSubmit={handleChatSubmit}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={cancelScheduledClose}
                className="w-56 bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-lg flex items-center border border-gray-200 dark:border-slate-700"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={() => {
                    if (!isThinking) scheduleClosePanel();
                  }}
                  placeholder="跟煤球说点啥喵..."
                  className="bg-transparent border-none outline-none text-sm px-3 py-1.5 w-full dark:text-white placeholder-gray-400"
                  disabled={isThinking}
                />
                <button
                  type="submit"
                  disabled={isThinking || !inputValue.trim()}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`rounded-full p-1.5 ml-1 flex items-center justify-center transition-colors shrink-0 ${
                    isThinking || !inputValue.trim()
                      ? 'bg-gray-300 text-gray-500'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                  </svg>
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
