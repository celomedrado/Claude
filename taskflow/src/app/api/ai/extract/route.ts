import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, users, meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractTasks, updateWorkSummary, AIConfigError } from "@/lib/ai";
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

  const userId = session.user.id;

  try {
    // Fetch projects and work summary in parallel
    const [userProjects, [user]] = await Promise.all([
      db.select({ name: projects.name }).from(projects).where(eq(projects.userId, userId)),
      db.select({ workSummary: users.workSummary }).from(users).where(eq(users.id, userId)),
    ]);

    const projectNames = userProjects.map((p) => p.name);
    const workSummary = user?.workSummary ?? null;

    // Extract tasks with work context
    const extracted = await extractTasks(text, projectNames, workSummary);

    // Store the transcript and update the rolling summary in parallel
    // (neither blocks the response — summary update is fire-and-forget safe
    //  because a stale summary just means slightly less context next time)
    const saveOps = Promise.all([
      db.insert(meetings).values({
        userId,
        rawText: text,
        taskCount: extracted.length,
      }),
      updateWorkSummary(workSummary, text).then((newSummary) =>
        db.update(users).set({ workSummary: newSummary }).where(eq(users.id, userId))
      ),
    ]);

    // Wait for both to complete before responding so the user's next
    // extraction immediately benefits from the updated summary
    await saveOps;

    return NextResponse.json({ tasks: extracted });
  } catch (err) {
    if (err instanceof AIConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Task extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
