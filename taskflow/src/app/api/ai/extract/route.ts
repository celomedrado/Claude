import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractTasks } from "@/lib/ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const userProjects = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.userId, session.user.id));

  const projectNames = userProjects.map((p) => p.name);
  const extracted = await extractTasks(text, projectNames);

  return NextResponse.json({ tasks: extracted });
}
