import { getSiteSetting } from './content-store';
import {
  type AiCatConfig,
  DEFAULT_AI_CAT_CONFIG,
  buildChatCompletionsUrl,
  isGoogleGenerativeBaseUrl,
  normalizeAiCatConfig,
} from './ai-cat-config-shared';

export type { AiCatConfig } from './ai-cat-config-shared';

export async function getAiCatConfig(): Promise<AiCatConfig> {
  const fallback = normalizeAiCatConfig();
  try {
    const raw = await getSiteSetting('geminiConfig');
    if (!raw) {
      return {
        ...fallback,
        api_key:
          fallback.api_key ||
          (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || '').trim(),
      };
    }
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object') {
      const cfg = normalizeAiCatConfig(parsed as Record<string, unknown>);
      if (!cfg.api_key) {
        cfg.api_key = (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
      }
      return cfg;
    }
  } catch {
    /* 回退 */
  }
  return {
    ...fallback,
    api_key:
      fallback.api_key || (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || '').trim(),
  };
}

export async function requestAiCatReply(config: AiCatConfig, userMessage: string): Promise<string> {
  const apiKey = config.api_key?.trim();
  if (!apiKey) {
    throw new Error('未配置 API Key，请在设置 → AI 煤球配置 中填写');
  }

  if (isGoogleGenerativeBaseUrl(config.base_url)) {
    return requestGeminiNative(config, userMessage, apiKey);
  }

  const url = buildChatCompletionsUrl(config.base_url || DEFAULT_AI_CAT_CONFIG.base_url);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model_name,
      messages: [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: config.max_tokens,
      temperature: config.temperature,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || data?.message || JSON.stringify(data).slice(0, 200);
    throw new Error(`模型请求失败 (${response.status}): ${msg}`);
  }

  return (
    data?.choices?.[0]?.message?.content?.trim() ||
    data?.choices?.[0]?.text?.trim() ||
    '本喵现在不想理你喵...'
  );
}

async function requestGeminiNative(config: AiCatConfig, userMessage: string, apiKey: string): Promise<string> {
  const model = config.model_name;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: config.systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: {
        maxOutputTokens: config.max_tokens,
        temperature: config.temperature,
      },
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini 错误 ${response.status}`);
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '本喵现在不想理你喵...';
}
