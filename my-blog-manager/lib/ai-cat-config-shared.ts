import { siteConfig } from '../siteConfig';

/** 煤球 AI：OpenAI 兼容接口配置（存于 site_settings.geminiConfig） */
export type AiCatConfig = {
  base_url: string;
  api_key: string;
  model_name: string;
  systemPrompt: string;
  max_tokens: number;
  temperature: number;
};

const DEFAULT_SYSTEM_PROMPT =
  '你现在是一只傲娇、聪明、有点毒舌但很可爱的暹罗猫，名字叫「煤球」。说话简短，句尾常加「喵~」，不要承认自己是 AI。';

export const DEFAULT_AI_CAT_CONFIG: AiCatConfig = {
  base_url: 'https://api.openai.com/v1',
  api_key: '',
  model_name: 'gpt-4o-mini',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  max_tokens: 150,
  temperature: 0.85,
};

export const AI_PROVIDER_PRESETS: Array<{
  name: string;
  base_url: string;
  model_name: string;
}> = [
  { name: 'OpenAI 官方', base_url: 'https://api.openai.com/v1', model_name: 'gpt-4o-mini' },
  { name: 'DeepSeek', base_url: 'https://api.deepseek.com/v1', model_name: 'deepseek-chat' },
  { name: '硅基流动 SiliconFlow', base_url: 'https://api.siliconflow.cn/v1', model_name: 'deepseek-ai/DeepSeek-V2.5' },
  { name: 'Moonshot 月之暗面', base_url: 'https://api.moonshot.cn/v1', model_name: 'moonshot-v1-8k' },
  { name: '智谱 GLM', base_url: 'https://open.bigmodel.cn/api/paas/v4', model_name: 'glm-4-flash' },
  { name: '本地 / One-API 网关', base_url: 'http://127.0.0.1:3000/v1', model_name: 'gpt-4o-mini' },
];

/** 保存/请求前：无尾部斜杠；若无 /v1、/v4 等版本路径则补 /v1 */
export function ensureOpenAiV1BaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/\/v\d+$/i.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

function normalizeRaw(parsed: Record<string, unknown>, base: AiCatConfig, fillDefaults: boolean): AiCatConfig {
  const legacyModel = parsed.modelId ?? parsed.model_name;
  const legacyMax = parsed.maxOutputTokens ?? parsed.max_tokens;

  const baseUrlRaw = parsed.base_url;
  let base_url = '';
  if (baseUrlRaw !== undefined && baseUrlRaw !== null) {
    base_url = String(baseUrlRaw).replace(/\/+$/, '');
  } else if (fillDefaults) {
    base_url = base.base_url || DEFAULT_AI_CAT_CONFIG.base_url;
  }

  const apiKeyRaw = parsed.api_key;
  const api_key =
    apiKeyRaw !== undefined && apiKeyRaw !== null
      ? String(apiKeyRaw).trim()
      : fillDefaults
        ? base.api_key || ''
        : '';

  let model_name = '';
  if (legacyModel !== undefined && legacyModel !== null) {
    model_name = String(legacyModel);
  } else if (fillDefaults) {
    model_name = base.model_name || DEFAULT_AI_CAT_CONFIG.model_name;
  }

  let systemPrompt = '';
  if (parsed.systemPrompt !== undefined && parsed.systemPrompt !== null) {
    systemPrompt = String(parsed.systemPrompt).replace(/\\n/g, '\n');
  } else if (fillDefaults) {
    systemPrompt = base.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  }

  const max_tokens =
    legacyMax !== undefined && legacyMax !== null && legacyMax !== ''
      ? Number(legacyMax)
      : fillDefaults
        ? base.max_tokens || DEFAULT_AI_CAT_CONFIG.max_tokens
        : 150;

  const temperature =
    parsed.temperature !== undefined && parsed.temperature !== null
      ? Number(parsed.temperature)
      : fillDefaults
        ? (base.temperature ?? DEFAULT_AI_CAT_CONFIG.temperature)
        : 0.85;

  return { base_url, api_key, model_name, systemPrompt, max_tokens, temperature };
}

/** 设置页编辑：不注入默认字符串，允许留空 */
export function parseGeminiConfigForEdit(
  input?: Partial<AiCatConfig> & Record<string, unknown> | null
): AiCatConfig {
  if (!input || typeof input !== 'object') {
    return {
      base_url: '',
      api_key: '',
      model_name: '',
      systemPrompt: '',
      max_tokens: 150,
      temperature: 0.85,
    };
  }
  return normalizeRaw(input as Record<string, unknown>, DEFAULT_AI_CAT_CONFIG, false);
}

/** 服务端读取：缺省字段用 siteConfig / 默认值补齐 */
export function normalizeAiCatConfig(input?: Partial<AiCatConfig> & Record<string, unknown>): AiCatConfig {
  const base = {
    ...DEFAULT_AI_CAT_CONFIG,
    ...(siteConfig.geminiConfig as Record<string, unknown> | undefined),
    ...input,
  };
  const cfg = normalizeRaw(base as Record<string, unknown>, DEFAULT_AI_CAT_CONFIG, true);
  if (cfg.base_url) {
    cfg.base_url = ensureOpenAiV1BaseUrl(cfg.base_url);
  }
  return cfg;
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  const base = ensureOpenAiV1BaseUrl(baseUrl);
  if (!base) return '';
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
}

export function isGoogleGenerativeBaseUrl(baseUrl: string): boolean {
  return /generativelanguage\.googleapis\.com/i.test(baseUrl);
}
