import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import ProjectsBoard from './ProjectsBoard';
import { getProjects } from '../../lib/content-store';
import { getRuntimeSiteConfig } from '../../lib/runtime-site-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata() {
  const siteConfig = await getRuntimeSiteConfig();
  return {
    title: `项目矩阵 | ${siteConfig.title}`,
    description: '开源项目与代码仓库展示',
  };
}

export default async function ProjectsPage() {
  const projectsData = await getProjects();
  return (
    <div className="min-h-screen relative pb-20">
      <Navbar />
      <PageTransition>
        <ProjectsBoard projectsData={projectsData} />
      </PageTransition>
    </div>
  );
}
