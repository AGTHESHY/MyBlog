/** MySQL DATETIME 列格式：YYYY-MM-DD HH:mm:ss */
export function toMysqlDatetime(input?: string | Date | null): string {
  const d = parseToDate(input);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseToDate(input?: string | Date | null): Date {
  if (input instanceof Date && !Number.isNaN(input.getTime())) return input;
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s) return new Date();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return new Date(s.replace(' ', 'T'));
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** 读出后格式化为前端常用 ISO 日期字符串 */
export function fromMysqlDatetime(input: string | null | undefined): string {
  if (!input) return new Date(0).toISOString();
  const s = String(input).trim();
  if (!s) return new Date(0).toISOString();
  if (s.includes('T')) return s;
  return new Date(s.replace(' ', 'T') + 'Z').toISOString();
}
