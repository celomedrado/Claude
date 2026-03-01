"use server";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getNextDueDate } from "@/lib/task-parser";

export type CreateTaskInput = {
  title: string;
  description?: string;
  projectId?: string | null;
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: string | null;
  status?: "todo" | "in_progress" | "done" | "archived";
  sourceText?: string | null;
  aiGenerated?: boolean;
  /** Recurrence pattern: "daily", "weekdays", or "weekly:N" */
  recurrenceRule?: string | null;
  /** Links to the original recurring task (set automatically) */
  recurrenceSourceId?: string | null;
};

export async function createTask(input: CreateTaskInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!input.title?.trim()) throw new Error("Title is required");

  const [task] = await db
    .insert(tasks)
    .values({
      userId: session.user.id,
      title: input.title.trim(),
      description: input.description || "",
      projectId: input.projectId || null,
      priority: input.priority || "medium",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      status: input.status || "todo",
      sourceText: input.sourceText || null,
      aiGenerated: input.aiGenerated || false,
      recurrenceRule: input.recurrenceRule || null,
      recurrenceSourceId: input.recurrenceSourceId || null,
    })
    .returning();

  revalidatePath("/");
  return task;
}

export async function updateTask(
  taskId: string,
  updates: Partial<Omit<CreateTaskInput, "sourceText" | "aiGenerated">>
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const setValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.title !== undefined) setValues.title = updates.title.trim();
  if (updates.description !== undefined) setValues.description = updates.description;
  if (updates.projectId !== undefined) setValues.projectId = updates.projectId || null;
  if (updates.priority !== undefined) setValues.priority = updates.priority;
  if (updates.status !== undefined) setValues.status = updates.status;
  if (updates.dueDate !== undefined) {
    setValues.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
  }

  await db
    .update(tasks)
    .set(setValues)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, session.user.id)));

  // Recurrence: when a recurring task is marked as "done", create the next occurrence
  if (updates.status === "done") {
    const [completedTask] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, session.user.id)));

    if (completedTask?.recurrenceRule) {
      // Guard: only create next occurrence if one doesn't already exist
      const sourceId = completedTask.recurrenceSourceId || completedTask.id;
      const [existing] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(
            eq(tasks.recurrenceSourceId, sourceId),
            eq(tasks.status, "todo"),
            eq(tasks.userId, session.user.id)
          )
        );

      if (!existing) {
        const nextDue = getNextDueDate(completedTask.recurrenceRule);
        await db.insert(tasks).values({
          userId: session.user.id,
          title: completedTask.title,
          description: completedTask.description || "",
          projectId: completedTask.projectId,
          priority: completedTask.priority as CreateTaskInput["priority"],
          dueDate: new Date(nextDue),
          status: "todo",
          recurrenceRule: completedTask.recurrenceRule,
          recurrenceSourceId: sourceId,
        });
      }
    }
  }

  revalidatePath("/");
}

export async function deleteTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, session.user.id)));

  revalidatePath("/");
}

export async function bulkCreateTasks(taskInputs: CreateTaskInput[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const values = taskInputs.map((input) => ({
    userId: session.user!.id!,
    title: input.title.trim(),
    description: input.description || "",
    projectId: input.projectId || null,
    priority: input.priority || ("medium" as const),
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    status: input.status || ("todo" as const),
    sourceText: input.sourceText || null,
    aiGenerated: input.aiGenerated || false,
  }));

  const created = await db.insert(tasks).values(values).returning();

  revalidatePath("/");
  return created;
}
