/**
 * 从仓库根目录 .env 提取 NETEASE_PRIVATE_KEY 写入 config/netease_private_key.pem
 * 供 Docker 挂载（避免超长环境变量在 Compose 中被截断）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
const outPath = path.join(root, 'config', 'netease_private_key.pem');

if (!fs.existsSync(envPath)) {
  console.error('未找到 .env:', envPath);
  process.exit(1);
}

const text = fs.readFileSync(envPath, 'utf8');
const match = text.match(/^NETEASE_PRIVATE_KEY=(.+)$/m);
if (!match?.[1]?.trim()) {
  console.error('.env 中未找到 NETEASE_PRIVATE_KEY=');
  process.exit(1);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, match[1].trim(), 'utf8');
console.log('已写入', outPath, '长度', match[1].trim().length);
