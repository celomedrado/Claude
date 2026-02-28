import { auth } from "@/lib/auth";
import { generateDocument, AIConfigError, type DocTemplate } from "@/lib/ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tasks, template } = await req.json();

  if (!tasks?.length || !template) {
    return NextResponse.json({ error: "Tasks and template are required" }, { status: 400 });
  }

  const validTemplates: DocTemplate[] = ["status_update", "meeting_brief", "action_items"];
  if (!validTemplates.includes(template)) {
    return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  }

  try {
    const document = await generateDocument(tasks, template);
    return NextResponse.json({ document });
  } catch (err) {
    if (err instanceof AIConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Document generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
