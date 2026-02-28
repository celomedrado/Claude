import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProjectList } from "./project-list";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      taskCount: sql<number>`(select count(*) from tasks where tasks.project_id = ${projects.id})`,
    })
    .from(projects)
    .where(eq(projects.userId, session.user.id));

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
      <p className="mt-1 text-sm text-gray-500">Manage your projects</p>
      <ProjectList projects={userProjects} />
    </div>
  );
}
