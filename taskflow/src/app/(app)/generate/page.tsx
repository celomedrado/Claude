import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { GenerateClient } from "./generate-client";

export default async function GeneratePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userProjects = await db
    .select({ id: projects.id, name: projects.name, color: projects.color })
    .from(projects)
    .where(eq(projects.userId, session.user.id));

  const projectMap = new Map(userProjects.map((p) => [p.id, p]));

  const allTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
    })
    .from(tasks)
    .where(eq(tasks.userId, session.user.id));

  const taskItems = allTasks.map((t) => {
    const project = t.projectId ? projectMap.get(t.projectId) : null;
    return {
      id: t.id,
      title: t.title,
      description: t.description || "",
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : null,
      projectName: project?.name || null,
    };
  });

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Generate Document</h2>
      <p className="mt-1 text-sm text-gray-500 mb-6">
        Select tasks and generate a status update, meeting brief, or action items summary.
      </p>
      <GenerateClient tasks={taskItems} />
    </div>
  );
}
