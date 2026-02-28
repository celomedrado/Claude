import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { categorizeTask, AIConfigError } from "@/lib/ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const userProjects = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.userId, session.user.id));

    const projectNames = userProjects.map((p) => p.name);
    const suggestion = await categorizeTask(title, description || "", projectNames);

    return NextResponse.json(suggestion);
  } catch (err) {
    if (err instanceof AIConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Categorization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
