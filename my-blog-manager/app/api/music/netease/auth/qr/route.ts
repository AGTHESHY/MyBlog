import crypto from 'crypto';
import { NextResponse } from 'next/server';
import {
  NETEASE_QR_TTL_MS,
  NETEASE_QR_DOC,
  buildNeteaseQrImageUrl,
  createOpenApiQrLogin,
  isNeteaseOpenApiConfigured,
} from '../../../../../../lib/netease-open-api';
import { saveNeteaseQrPending } from '../../../../../../lib/netease-user-session';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!isNeteaseOpenApiConfigured()) {
    return NextResponse.json(
      { success: false, message: '请先在 .env 配置 NETEASE_APP_ID / NETEASE_APP_SECRET / NETEASE_PRIVATE_KEY' },
      { status: 400 }
    );
  }

  const { unikey, message } = await createOpenApiQrLogin();
  if (!unikey) {
    return NextResponse.json({ success: false, message: message || '无法生成二维码' }, { status: 500 });
  }

  const sessionId = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + NETEASE_QR_TTL_MS;
  await saveNeteaseQrPending(sessionId, unikey, expiresAt);

  const { qrUrl, qrImageUrl } = buildNeteaseQrImageUrl(unikey);

  return NextResponse.json({
    success: true,
    data: {
      sessionId,
      unikey,
      qrUrl,
      qrImageUrl,
      expiresAt,
      ttlMs: NETEASE_QR_TTL_MS,
      doc: NETEASE_QR_DOC,
    },
  });
}
