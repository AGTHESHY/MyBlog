/**
 * 网易云开放平台 CLI 密钥工具（个人开发者）
 * 官方文档：https://developer.music.163.com/st/developer/document?docId=2327e302009c437eb02af48f63d6e514
 *
 * 用法：
 *   node scripts/netease-setup-keys.mjs generate   # OpenSSL 生成密钥对
 *   node scripts/netease-setup-keys.mjs format       # 将已有 PEM 格式化为控制台所需单行
 *   node scripts/netease-setup-keys.mjs sync-env     # 将 PKCS8 私钥写入 .env 与 config/netease_private_key.pem
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const keyDir = path.join(root, 'config', 'netease_keys');
const pkcs8Path = path.join(keyDir, 'app_private_key_pkcs8.pem');
const publicPath = path.join(keyDir, 'app_public_key.pem');
const dockerPemPath = path.join(root, 'config', 'netease_private_key.pem');
const envPath = path.join(root, '.env');

function pemToSingleLine(text) {
  return text
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function readPkcs8() {
  if (fs.existsSync(pkcs8Path)) return fs.readFileSync(pkcs8Path, 'utf8').trim();
  if (fs.existsSync(dockerPemPath)) return fs.readFileSync(dockerPemPath, 'utf8').trim();
  return '';
}

function cmdGenerate() {
  fs.mkdirSync(keyDir, { recursive: true });
  const privateRaw = path.join(keyDir, 'app_private_key.pem');

  console.log('正在用 OpenSSL 生成 RSA 2048 密钥对…\n');
  execSync(`openssl genrsa -out "${privateRaw}" 2048`, { stdio: 'inherit' });
  execSync(
    `openssl pkcs8 -topk8 -inform PEM -in "${privateRaw}" -outform PEM -nocrypt -out "${pkcs8Path}"`,
    { stdio: 'inherit' }
  );
  execSync(`openssl rsa -in "${privateRaw}" -pubout -out "${publicPath}"`, { stdio: 'inherit' });

  const publicLine = pemToSingleLine(fs.readFileSync(publicPath, 'utf8'));
  const privateLine = pemToSingleLine(fs.readFileSync(pkcs8Path, 'utf8'));

  fs.writeFileSync(dockerPemPath, privateLine, 'utf8');

  console.log('\n=== 下一步（控制台）===');
  console.log('1. 打开 https://developer.music.163.com/st/developer/ 创建应用');
  console.log('2. 在「接口加密方式」粘贴下方【单行公钥】并保存');
  console.log('3. 复制控制台中的 AppID、AppSecret 到仓库根目录 .env\n');
  console.log('【单行公钥 — 复制到网易云控制台】');
  console.log(publicLine);
  console.log('\n【私钥已写入】');
  console.log('  ', dockerPemPath);
  console.log('\n然后执行：');
  console.log('  node scripts/netease-setup-keys.mjs sync-env');
  console.log('  # 在 .env 填好 NETEASE_APP_ID / NETEASE_APP_SECRET 后');
  console.log('  docker compose up -d --build');
}

function cmdFormat() {
  const pub = fs.existsSync(publicPath) ? fs.readFileSync(publicPath, 'utf8') : '';
  const pkcs8 = readPkcs8();
  if (!pub && !pkcs8) {
    console.error('未找到密钥文件。先运行: node scripts/netease-setup-keys.mjs generate');
    process.exit(1);
  }
  if (pub) {
    console.log('【单行公钥】');
    console.log(pemToSingleLine(pub));
  }
  if (pkcs8) {
    console.log('\n【单行 PKCS8 私钥（供 .env NETEASE_PRIVATE_KEY）】');
    console.log(pemToSingleLine(pkcs8));
  }
}

function upsertEnv(key, value) {
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  text = re.test(text) ? text.replace(re, line) : `${text.replace(/\s*$/, '')}\n${line}\n`;
  fs.writeFileSync(envPath, text, 'utf8');
}

function cmdSyncEnv() {
  const pkcs8 = readPkcs8();
  if (!pkcs8) {
    console.error('未找到 PKCS8 私钥。先运行 generate 或将 app_private_key_pkcs8.pem 放到 config/netease_keys/');
    process.exit(1);
  }
  const privateLine = pemToSingleLine(pkcs8);
  fs.mkdirSync(path.dirname(dockerPemPath), { recursive: true });
  fs.writeFileSync(dockerPemPath, privateLine, 'utf8');
  if (fs.existsSync(envPath)) {
    upsertEnv('NETEASE_PRIVATE_KEY', privateLine);
    console.log('已更新 .env 中的 NETEASE_PRIVATE_KEY');
  } else {
    console.log('未找到 .env，请复制 .env.example 后手动填写 NETEASE_PRIVATE_KEY');
  }
  console.log('已写入', dockerPemPath);
  console.log('\n请确认 .env 中已填写：');
  console.log('  NETEASE_APP_ID=控制台 AppID');
  console.log('  NETEASE_APP_SECRET=控制台 AppSecret');
  console.log('  NETEASE_REDIRECT_URI=http://localhost:3001/api/music/netease/auth/callback');
  console.log('\n验证：访问 http://localhost:3001/api/music/netease/auth/debug');
}

const sub = process.argv[2] || 'help';
if (sub === 'generate') cmdGenerate();
else if (sub === 'format') cmdFormat();
else if (sub === 'sync-env') cmdSyncEnv();
else {
  console.log(`用法:
  node scripts/netease-setup-keys.mjs generate   # CLI 生成密钥对（需本机 openssl）
  node scripts/netease-setup-keys.mjs format     # 输出控制台所需的单行公钥/私钥
  node scripts/netease-setup-keys.mjs sync-env   # 私钥写入 .env 与 Docker PEM

文档: https://developer.music.163.com/st/developer/document?docId=2327e302009c437eb02af48f63d6e514`);
}
