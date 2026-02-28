import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ExtractClient } from "./extract-client";

export default async function ExtractPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userProjects = await db
    .select({ id: projects.id, name: projects.name, color: projects.color })
    .from(projects)
    .where(eq(projects.userId, session.user.id));

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Paste & Extract</h2>
      <p className="mt-1 text-sm text-gray-500 mb-6">
        Paste meeting notes, Slack messages, or any text — AI will extract actionable tasks.
      </p>
      <ExtractClient projects={userProjects} />
    </div>
  );
}
