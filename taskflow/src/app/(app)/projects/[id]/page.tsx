import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { TaskList, type TaskItem } from "@/components/task-list";
import Link from "next/link";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), eq(projects.userId, session.user.id)),
  });

  if (!project) notFound();

  const allProjects = await db
    .select({ id: projects.id, name: projects.name, color: projects.color })
    .from(projects)
    .where(eq(projects.userId, session.user.id));

  const projectTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      aiGenerated: tasks.aiGenerated,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(and(eq(tasks.userId, session.user.id), eq(tasks.projectId, id)));

  const taskItems: TaskItem[] = projectTasks.map((t) => ({
    ...t,
    status: t.status as TaskItem["status"],
    priority: t.priority as TaskItem["priority"],
    projectName: project.name,
    projectColor: project.color,
  }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        <Link href="/projects" className="hover:underline text-indigo-600">
          Projects
        </Link>
        {" / "}
        {project.name}
      </p>

      <TaskList
        tasks={taskItems}
        projects={allProjects}
        currentProjectId={project.id}
      />
    </div>
  );
}
