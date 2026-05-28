import { NextResponse } from 'next/server';
import {
  getKugouOpenApiConfigError,
  isKugouOpenApiConfigured,
  KUGOU_OPENAPI_DOC_URL,
} from '../../../../../lib/kugou-openapi';

export const dynamic = 'force-dynamic';

export async function GET() {
  const openapi = isKugouOpenApiConfigured();
  return NextResponse.json({
    success: true,
    data: {
      openapi,
      openapiRequired: true,
      phoneLoginEnabled: false,
      configHint: openapi ? null : getKugouOpenApiConfigError(),
      docUrl: KUGOU_OPENAPI_DOC_URL,
    },
  });
}
