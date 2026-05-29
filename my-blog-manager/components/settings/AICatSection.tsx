"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, Bot, Sparkles, Sliders, MessageSquareText, Link2, KeyRound, Cpu, Loader2 } from 'lucide-react';
import { useToast } from '../ToastProvider';
import {
  AI_PROVIDER_PRESETS,
  ensureOpenAiV1BaseUrl,
  parseGeminiConfigForEdit,
  type AiCatConfig,
} from '../../lib/ai-cat-config-shared';

export default function AICatSection({
  formData,
  handleUpdate,
}: {
  formData: any;
  handleUpdate: (k: string, v: unknown) => void;
  pushToQueue?: (label: string, key?: string, value?: unknown) => void;
}) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<AiCatConfig>(() => parseGeminiConfigForEdit(formData.geminiConfig));
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastExternalRef = useRef<string>('');

  // 仅从父级拉取配置时同步（如首次打开设置页），避免输入中被默认值覆盖
  useEffect(() => {
    const serialized = JSON.stringify(formData.geminiConfig ?? {});
    if (serialized === lastExternalRef.current) return;
    lastExternalRef.current = serialized;
    setDraft(parseGeminiConfigForEdit(formData.geminiConfig));
  }, [formData.geminiConfig]);

  const patchDraft = (patch: Partial<AiCatConfig>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const applyPreset = (preset: (typeof AI_PROVIDER_PRESETS)[number]) => {
    patchDraft({
      base_url: preset.base_url,
      model_name: preset.model_name,
    });
    showToast(`已套用「${preset.name}」`, 'info');
  };

  const buildPayload = (): AiCatConfig => ({
    ...draft,
    base_url: draft.base_url.trim() ? ensureOpenAiV1BaseUrl(draft.base_url) : '',
    systemPrompt: draft.systemPrompt.replace(/\n/g, '\\n'),
  });

  const handleSaveToDb = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      const res = await fetch('/api/config/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: { geminiConfig: payload } }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '保存失败');
      }
      lastExternalRef.current = JSON.stringify(payload);
      handleUpdate('geminiConfig', payload);
      setDraft(parseGeminiConfigForEdit(payload));
      showToast('煤球 AI 配置已保存到数据库，立即生效', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/50 dark:border-slate-800/50 rounded-[40px] p-8 shadow-xl"
    >
      <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/40 dark:border-slate-700/50 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Bot className="text-indigo-500" size={28} /> AI 煤球配置
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">
            base_url + api_key + model_name，保存时自动补全 /v1（若尚未包含版本路径）
          </p>
        </div>
        <button
          onClick={handleSaveToDb}
          disabled={saving}
          className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 text-sm"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          保存到数据库
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
        <p className="font-black text-emerald-600 dark:text-emerald-400">无需再改 .env</p>
        <p>在网页填写 api_key 后保存即可。base_url 可只填域名，保存时会自动补上 /v1（已有 /v1、/v4 等则不会改动）。</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {AI_PROVIDER_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => applyPreset(p)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300 mb-2">
            <Link2 size={16} className="text-slate-400" /> base_url
          </label>
          <input
            type="text"
            value={draft.base_url}
            onChange={(e) => patchDraft({ base_url: e.target.value })}
            className="w-full bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl py-3 px-5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            placeholder="https://api.openai.com/v1"
            autoComplete="off"
          />
          <p className="text-[11px] text-slate-400 mt-1.5 ml-1">
            示例：https://api.openai.com/v1 或 https://api.deepseek.com（保存时无 /v1 会自动补上）
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300 mb-2">
            <KeyRound size={16} className="text-slate-400" /> api_key
          </label>
          <div className="flex gap-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={draft.api_key}
              onChange={(e) => patchDraft({ api_key: e.target.value })}
              className="flex-1 bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl py-3 px-5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="sk-xxxxxxxx"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="px-4 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              {showApiKey ? '隐藏' : '显示'}
            </button>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300 mb-2">
            <Cpu size={16} className="text-slate-400" /> model_name
          </label>
          <input
            type="text"
            value={draft.model_name}
            onChange={(e) => patchDraft({ model_name: e.target.value })}
            className="w-full bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl py-3 px-5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            placeholder="gpt-4o-mini / deepseek-chat"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300 mb-2">
            <MessageSquareText size={16} className="text-slate-400" /> system_prompt（煤球性格）
          </label>
          <textarea
            value={draft.systemPrompt}
            onChange={(e) => patchDraft({ systemPrompt: e.target.value })}
            className="w-full bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl py-4 px-5 min-h-[180px] resize-y text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/50 custom-scrollbar"
            placeholder="例如：你是一只叫煤球的猫，说话简短，句尾加「喵~」…"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                <Sliders size={16} /> max_tokens
              </label>
              <span className="text-xs font-black text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-md">
                {draft.max_tokens}
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="2000"
              step="10"
              value={draft.max_tokens}
              onChange={(e) => patchDraft({ max_tokens: Number(e.target.value) })}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg accent-indigo-500 cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                <Sparkles size={16} /> temperature
              </label>
              <span className="text-xs font-black text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-md">
                {draft.temperature}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={draft.temperature}
              onChange={(e) => patchDraft({ temperature: Number(e.target.value) })}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
