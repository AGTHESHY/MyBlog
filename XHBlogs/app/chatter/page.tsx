import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import ChatterBoard from './ChatterBoard';
import { getChatters } from '../../lib/content-store';
import { getRuntimeSiteConfig } from '../../lib/runtime-site-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata() {
  const siteConfig = await getRuntimeSiteConfig();
  return {
    title: `杂谈 | ${siteConfig.title}`,
    description: '日常碎片与灵感记录',
  };
}

export default async function ChatterPage() {
  const chatters = await getChatters();

  return (
    <div className="min-h-screen relative pb-10">
      <Navbar />
      <PageTransition>
        <ChatterBoard chatters={chatters} />
      </PageTransition>
    </div>
  );
}
