import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import TimelineClient from '../../components/TimelineClient';
import { ToastProvider } from '../../components/ToastProvider';
import { getPosts } from '../../lib/content-store';
import { getRuntimeSiteConfig } from '../../lib/runtime-site-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata() {
  const siteConfig = await getRuntimeSiteConfig();
  return { title: `归档与探索 | ${siteConfig.title}` };
}

export default async function Timeline() {
  const siteConfig = await getRuntimeSiteConfig();
  const posts = await getPosts();
  let tagCounts: Record<string, number> = {};
  posts.forEach((post) => {
    const postTags = post.tags && Array.isArray(post.tags) ? post.tags : ['未分类'];
    postTags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    if (!post.cover) post.cover = siteConfig.defaultPostCover;
  });

  const tagsArray = Object.keys(tagCounts)
    .map(name => ({ name, count: tagCounts[name] }))
    .sort((a, b) => b.count - a.count);

  return (
    <ToastProvider>
      <div className="min-h-screen relative pb-20">
        <Navbar />
        <PageTransition>
          <TimelineClient posts={posts} tags={tagsArray} />
        </PageTransition>
      </div>
    </ToastProvider>
  );
}
