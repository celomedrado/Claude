import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { TaskList, type TaskItem } from "@/components/task-list";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const allProjects = await db
    .select({ id: projects.id, name: projects.name, color: projects.color })
    .from(projects)
    .where(eq(projects.userId, session.user.id));

  const projectMap = new Map(allProjects.map((p) => [p.id, p]));

  const allTasks = await db
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
    .where(eq(tasks.userId, session.user.id));

  const taskItems: TaskItem[] = allTasks.map((t) => {
    const project = t.projectId ? projectMap.get(t.projectId) : null;
    return {
      ...t,
      status: t.status as TaskItem["status"],
      priority: t.priority as TaskItem["priority"],
      projectName: project?.name || null,
      projectColor: project?.color || null,
    };
  });

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">All Tasks</h2>
      <p className="mt-1 text-sm text-gray-500 mb-6">
        Every task across all projects
      </p>
      <TaskList tasks={taskItems} projects={allProjects} />
    </div>
  );
}
