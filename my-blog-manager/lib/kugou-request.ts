export function getClientIpFromHeaders(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0]?.trim();
    if (ip) return ip;
  }
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return '127.0.0.1';
}

/** 解析酷狗 HTTP 响应为 JSON，避免 HTML 错误页触发 SyntaxError */
export async function parseKugouHttpJson<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith('<')) {
    throw new Error(
      `${label}返回异常（HTTP ${res.status}），请稍后重试或重新登录酷狗账号` +
        (trimmed.length ? `：${trimmed.replace(/\s+/g, ' ').slice(0, 60)}` : '')
    );
  }
  try {
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed) as T;
    }
    const match = trimmed.match(/^[^(]+\(([\s\S]*)\)\s*;?$/);
    if (match) return JSON.parse(match[1]) as T;
    throw new Error('格式无法识别');
  } catch (e) {
    if (e instanceof Error && e.message.includes('返回异常')) throw e;
    throw new Error(`${label}响应解析失败（HTTP ${res.status}）`);
  }
}
