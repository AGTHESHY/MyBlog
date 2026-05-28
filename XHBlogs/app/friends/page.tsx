import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import FriendsBoard from './FriendsBoard';
import {siteConfig} from "@/siteConfig";
import { getFriends } from '../../lib/content-store';

export const metadata = {
  title: "友链 | " + siteConfig.title,
  description: "赛博空间里的有趣灵魂",
};

export default async function FriendsPage() {
  const friendsData = await getFriends();
  return (
    <div className="min-h-screen relative pb-20">
      <Navbar />
      <PageTransition>
        <div className="mt-28">
          <FriendsBoard friendsData={friendsData} />
        </div>
      </PageTransition>
    </div>
  );
}