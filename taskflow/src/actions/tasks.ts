"use server";

import { db, sqlite } from "@/db";
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
    })
    .returning();

  // Persist recurrence fields via raw SQL (columns live outside the
  // Drizzle schema to avoid errors when the migration hasn't run yet).
  if (task && (input.recurrenceRule || input.recurrenceSourceId)) {
    try {
      sqlite
        .prepare("UPDATE tasks SET recurrence_rule = ?, recurrence_source_id = ? WHERE id = ?")
        .run(input.recurrenceRule || null, input.recurrenceSourceId || null, task.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("no such column")) {
        throw err;
      }
    }
  }

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

  // Recurrence-on-complete: when a recurring task is marked "done",
  // schedule the next occurrence. Uses raw SQL since recurrence columns
  // live outside the Drizzle schema.
  if (updates.status === "done") {
    try {
      const row = sqlite
        .prepare("SELECT id, user_id, title, description, project_id, priority, recurrence_rule, recurrence_source_id FROM tasks WHERE id = ? AND user_id = ?")
        .get(taskId, session.user.id) as { id: string; user_id: string; title: string; description: string; project_id: string | null; priority: string; recurrence_rule: string | null; recurrence_source_id: string | null } | undefined;

      if (row?.recurrence_rule) {
        const sourceId = row.recurrence_source_id || row.id;

        // Guard: don't duplicate if a todo occurrence already exists
        const existing = sqlite
          .prepare("SELECT id FROM tasks WHERE recurrence_source_id = ? AND status = 'todo' AND user_id = ?")
          .get(sourceId, session.user.id);

        if (!existing) {
          const nextDue = getNextDueDate(row.recurrence_rule);
          const newId = crypto.randomUUID();
          sqlite
            .prepare(`
              INSERT INTO tasks (id, user_id, title, description, project_id, priority, due_date, status, recurrence_rule, recurrence_source_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?, ?, ?)
            `)
            .run(
              newId,
              session.user.id,
              row.title,
              row.description || "",
              row.project_id,
              row.priority,
              Math.floor(new Date(nextDue).getTime() / 1000),
              row.recurrence_rule,
              sourceId,
              Math.floor(Date.now() / 1000),
              Math.floor(Date.now() / 1000),
            );
        }
      }
    } catch (err: unknown) {
      // Only ignore "no such column" errors (recurrence columns not yet migrated).
      // Re-throw anything else so real bugs surface.
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("no such column")) {
        throw err;
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
