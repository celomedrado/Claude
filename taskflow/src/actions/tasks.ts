"use server";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type CreateTaskInput = {
  title: string;
  description?: string;
  projectId?: string | null;
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: string | null;
  status?: "todo" | "in_progress" | "done" | "archived";
  sourceText?: string | null;
  aiGenerated?: boolean;
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
