import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      todo: sql<number>`sum(case when ${tasks.status} = 'todo' then 1 else 0 end)`,
      inProgress: sql<number>`sum(case when ${tasks.status} = 'in_progress' then 1 else 0 end)`,
      done: sql<number>`sum(case when ${tasks.status} = 'done' then 1 else 0 end)`,
      overdue: sql<number>`sum(case when ${tasks.dueDate} < ${Math.floor(Date.now() / 1000)} and ${tasks.status} not in ('done', 'archived') then 1 else 0 end)`,
    })
    .from(tasks)
    .where(eq(tasks.userId, userId));

  const statCards = [
    { label: "Total Tasks", value: stats?.total ?? 0, color: "text-gray-900" },
    { label: "To Do", value: stats?.todo ?? 0, color: "text-blue-600" },
    { label: "In Progress", value: stats?.inProgress ?? 0, color: "text-yellow-600" },
    { label: "Done", value: stats?.done ?? 0, color: "text-green-600" },
    { label: "Overdue", value: stats?.overdue ?? 0, color: "text-red-600" },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
      <p className="mt-1 text-sm text-gray-500">
        Welcome back, {session.user.name}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-gray-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-medium text-gray-700">Quick Start</h3>
        <p className="mt-2 text-sm text-gray-500">
          Paste meeting notes or messages to automatically extract tasks, or create tasks manually from a project view.
        </p>
      </div>
    </div>
  );
}
