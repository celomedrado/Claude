import { Sidebar } from "./sidebar";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userProjects = await db
    .select({ id: projects.id, name: projects.name, color: projects.color })
    .from(projects)
    .where(eq(projects.userId, session.user.id));

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar projects={userProjects} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
