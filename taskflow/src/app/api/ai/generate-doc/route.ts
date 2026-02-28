import { auth } from "@/lib/auth";
import { generateDocument, type DocTemplate } from "@/lib/ai";
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

  const document = await generateDocument(tasks, template);

  return NextResponse.json({ document });
}
