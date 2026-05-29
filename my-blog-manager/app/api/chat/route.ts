import { getAiCatConfig, requestAiCatReply } from '../../../lib/ai-cat-config';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== 'string') {
      return Response.json({ error: '消息不能为空' }, { status: 400 });
    }

    const config = await getAiCatConfig();
    const reply = await requestAiCatReply(config, message);

    return Response.json({ reply });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '未知错误';
    console.error('[chat]', msg);
    return Response.json({ error: msg, reply: '本喵的大脑短路了喵...' }, { status: 500 });
  }
}

export async function GET() {
  const config = await getAiCatConfig();
  return Response.json({
    status: 'ready',
    model: config.model_name,
    base_url: config.base_url,
    has_api_key: Boolean(config.api_key),
  });
}
