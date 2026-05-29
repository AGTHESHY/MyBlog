#!/usr/bin/env node
/**
 * Probe NetEase CLI OpenAPI qrcode poll paths (dev only).
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const BASE = process.env.NETEASE_OPENAPI_BASE || 'https://openncm.music.163.com';
const appId = process.env.NETEASE_APP_ID;
let privateKey = process.env.NETEASE_PRIVATE_KEY || '';
if (!privateKey.includes('BEGIN')) {
  privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;
}

function device() {
  return {
    deviceType: 'openapi',
    os: 'ncmcli',
    channel: 'ncmcli',
    brand: 'ncmcli',
    model: 'Darwin_arm64_cli',
    appVer: '1.0.0',
    deviceId: 'ncmcli_probe',
    clientIp: '127.0.0.1',
    osVer: '1.0.0',
  };
}

function sign(biz, accessToken) {
  const params = {
    appId,
    bizContent: JSON.stringify(biz),
    device: JSON.stringify(device()),
    signType: 'RSA_SHA256',
    timestamp: String(Date.now()),
  };
  if (accessToken) params.accessToken = accessToken;
  const keys = Object.keys(params).sort();
  const payload = keys.map((k) => `${k}=${params[k]}`).join('&');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(payload);
  params.sign = signer.sign(privateKey, 'base64');
  return params;
}

function qs(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function postForm(path, biz, token) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: qs(sign(biz, token)),
  });
  const text = await res.text();
  try {
    return { path, status: res.status, json: JSON.parse(text) };
  } catch {
    return { path, status: res.status, text: text.slice(0, 200) };
  }
}

async function postJson(path, biz, token) {
  const signed = sign(biz, token);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signed),
  });
  const text = await res.text();
  try {
    return { path, status: res.status, json: JSON.parse(text) };
  } catch {
    return { path, status: res.status, text: text.slice(0, 200) };
  }
}

async function get(path, biz, token) {
  const url = `${BASE}${path}?${qs(sign(biz, token))}`;
  const res = await fetch(url);
  const text = await res.text();
  try {
    return { path, status: res.status, json: JSON.parse(text) };
  } catch {
    return { path, status: res.status, text: text.slice(0, 200) };
  }
}

const anon = await postJson('/openapi/music/basic/oauth2/login/anonymous', { clientId: appId });
const token = anon.json?.data?.accessToken;
console.log('anonymous', anon.json?.code, token?.slice(0, 12));

const qr = await get(
  '/openapi/music/basic/user/oauth2/qrcodekey/get/v2',
  { type: 2, expiredKey: '300' },
  token
);
const uniKey = qr.json?.data?.uniKey;
console.log('qr', qr.json?.code, uniKey);

const suffixes = [
  'check/get/v2',
  'check/v2',
  'status/get/v2',
  'poll/get/v2',
  'scan/get/v2',
  'login/get/v2',
  'client/login/get/v2',
  'result/get/v2',
  'access/token/get/v2',
  'token/get/v2',
];
const prefixes = [
  '/openapi/music/basic/user/oauth2/qrcodekey/',
  '/openapi/music/basic/user/oauth2/qrcode/',
  '/openapi/music/basic/oauth2/login/qrcode/',
  '/openapi/music/basic/oauth2/qrcode/',
];

const bizList = [
  { key: uniKey, type: 2 },
  { uniKey, type: 2 },
  { key: uniKey, type: 1 },
  { uniKey, type: 1 },
  { key: uniKey },
  { uniKey },
];

for (const prefix of prefixes) {
  for (const suffix of suffixes) {
    const p = prefix + suffix;
    for (const biz of bizList) {
      for (const fn of [get, postJson, postForm]) {
        const r = await fn(p, biz, token);
        const code = r.json?.code;
        if (code && code !== 404 && code !== 1404) {
          console.log('HIT', fn.name, p, JSON.stringify(biz), JSON.stringify(r.json)?.slice(0, 400));
        }
      }
    }
  }
}
