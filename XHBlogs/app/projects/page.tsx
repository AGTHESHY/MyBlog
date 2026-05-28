import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import ProjectsBoard from './ProjectsBoard';
import {siteConfig} from "@/siteConfig";
import { getProjects } from '../../lib/content-store';

export const metadata = {
  title: "项目矩阵 | " + siteConfig.title,
  description: "开源项目与代码仓库展示",
};

export default async function ProjectsPage() {
  const projectsData = await getProjects();
  return (
    <div className="min-h-screen relative pb-20">
      <Navbar />
      <PageTransition>
        <div className="mt-28">
          <ProjectsBoard projectsData={projectsData} />
        </div>
      </PageTransition>
    </div>
  );
}