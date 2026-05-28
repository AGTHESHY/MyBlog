import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'MySQL 模式无需再执行文件镜像，同步已完成。',
  });
}
