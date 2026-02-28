"use server";

import { db } from "@/db";
import { projects } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const color = (formData.get("color") as string) || "#6366f1";

  if (!name?.trim()) throw new Error("Name is required");

  await db.insert(projects).values({
    userId: session.user.id,
    name: name.trim(),
    color,
  });

  revalidatePath("/");
}

export async function updateProject(projectId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const color = formData.get("color") as string;

  const updates: Record<string, string> = {};
  if (name?.trim()) updates.name = name.trim();
  if (color) updates.color = color;

  await db
    .update(projects)
    .set(updates)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)));

  revalidatePath("/");
}

export async function deleteProject(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)));

  revalidatePath("/");
}
