import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import ChatterBoard from './ChatterBoard';
import { getChatters } from '../../lib/content-store';

export const metadata = {
  title: "杂谈 | XingHuiSama の 博客",
  description: "日常碎片与灵感记录",
};

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