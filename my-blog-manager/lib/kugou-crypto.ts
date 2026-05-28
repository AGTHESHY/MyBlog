import crypto from 'crypto';

const PUBLIC_RSA_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDIAG7QOELSYoIJvTFJhMpe1s/g
bjDJX51HBNnEl5HXqTW6lQ7LC8jr9fWZTwusknp+sVGzwd40MwP6U5yDE27M/X1+U
R4tvOGOqp94TJtQ1EPnWGWXngpeIW5GxoQGao1rmYWAu6oi1z9XkChrsUdC6DJE5E2
21wf/4WLFxwAtRQIDAQAB
-----END PUBLIC KEY-----`;

const ANDROID_APPID = 1005;
const CLIENTVER = 12000;
const SIGN_STR = 'OIlwieks28dk2k092lksi2UIkp';

function randomString(len = 16) {
  const chars = '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function md5(input: string) {
  return crypto.createHash('md5').update(input).digest('hex');
}

export function signParamsKey(clienttimeMs: number) {
  return md5(`${ANDROID_APPID}${SIGN_STR}${CLIENTVER}${clienttimeMs}`);
}

export function aesEncryptPayload(data: Record<string, string>) {
  const json = JSON.stringify(data);
  const tempKey = randomString(16).toLowerCase();
  const key = md5(tempKey).substring(0, 32);
  const iv = key.substring(key.length - 16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'utf8'), Buffer.from(iv, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  return { str: encrypted.toString('hex'), key: tempKey };
}

export function aesDecryptSecuParams(hex: string, key: string) {
  const aesKey = md5(key).substring(0, 32);
  const iv = aesKey.substring(aesKey.length - 16);
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(aesKey, 'utf8'),
    Buffer.from(iv, 'utf8')
  );
  const decrypted = Buffer.concat([decipher.update(Buffer.from(hex, 'hex')), decipher.final()]);
  try {
    return JSON.parse(decrypted.toString('utf8')) as Record<string, string>;
  } catch {
    return { token: decrypted.toString('utf8') };
  }
}

export function rsaEncryptLoginPk(payload: Record<string, unknown>, aesKey: string) {
  const plain = Buffer.from(JSON.stringify({ ...payload, key: aesKey }), 'utf8');
  const encrypted = crypto.publicEncrypt(
    {
      key: PUBLIC_RSA_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    plain
  );
  return encrypted.toString('hex').toUpperCase();
}

export function maskMobile(mobile: string) {
  const s = mobile.replace(/\D/g, '');
  if (s.length < 11) return s;
  return `${s.slice(0, 2)}*****${s.slice(10, 11)}`;
}
