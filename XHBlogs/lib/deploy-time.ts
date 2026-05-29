import { getSiteSetting } from './content-store';
import { siteConfig } from '../siteConfig';

export type DeployTimeSource = 'docker' | 'database' | 'config';

/** 部署起点：Docker 容器启动时间 → 数据库 → 站点配置 */
export async function getDeployedAtInfo(): Promise<{ deployedAt: string; source: DeployTimeSource }> {
  const fromEnv = process.env.DEPLOYED_AT?.trim();
  if (fromEnv) return { deployedAt: fromEnv, source: 'docker' };

  try {
    const fromDb = await getSiteSetting('deployed_at');
    if (fromDb?.trim()) return { deployedAt: fromDb.trim(), source: 'database' };
  } catch {
    /* 数据库未就绪时回退 */
  }

  return {
    deployedAt: siteConfig.buildDate || '2026-03-23T00:00:00',
    source: 'config',
  };
}
