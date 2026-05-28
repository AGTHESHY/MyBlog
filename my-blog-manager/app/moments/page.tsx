import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import MomentList from './MomentList';
import { siteConfig } from '../../siteConfig';
import { getMoments } from '../../lib/content-store';

export const metadata = {
  title: "说说 | " + siteConfig.authorName + " の 博客",
  description: "生活动态与瞬间记录",
};

export default async function MomentsPage() {
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