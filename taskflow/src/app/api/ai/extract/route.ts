import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractTasks, AIConfigError } from "@/lib/ai";
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

  try {
    const userProjects = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.userId, session.user.id));

    const projectNames = userProjects.map((p) => p.name);
    const extracted = await extractTasks(text, projectNames);

    return NextResponse.json({ tasks: extracted });
  } catch (err) {
    if (err instanceof AIConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Task extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
