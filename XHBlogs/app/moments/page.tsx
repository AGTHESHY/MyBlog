import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import MomentList from './MomentList';
import { getMoments } from '../../lib/content-store';
import { getRuntimeSiteConfig } from '../../lib/runtime-site-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata() {
  const siteConfig = await getRuntimeSiteConfig();
  return {
    title: `说说 | ${siteConfig.title}`,
    description: '生活动态与瞬间记录',
  };
}

export default async function MomentsPage() {
  const siteConfig = await getRuntimeSiteConfig();
  const allMoments = await getMoments();

  return (
    <div className="min-h-screen relative pb-10 flex flex-col">
      <Navbar />
      <PageTransition className="flex-1 flex flex-col">
        <MomentList
          moments={allMoments}
          authorName={siteConfig.authorName}
          avatarUrl={siteConfig.avatarUrl}
        />
      </PageTransition>
    </div>
  );
}
