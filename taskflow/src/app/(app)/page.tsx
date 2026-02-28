import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, projects } from "@/db/schema";
import { eq, and, sql, desc, ne, lte, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const now = new Date();

  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      todo: sql<number>`sum(case when ${tasks.status} = 'todo' then 1 else 0 end)`,
      inProgress: sql<number>`sum(case when ${tasks.status} = 'in_progress' then 1 else 0 end)`,
      done: sql<number>`sum(case when ${tasks.status} = 'done' then 1 else 0 end)`,
      overdue: sql<number>`sum(case when ${tasks.dueDate} < ${Math.floor(now.getTime() / 1000)} and ${tasks.status} not in ('done', 'archived') then 1 else 0 end)`,
    })
    .from(tasks)
    .where(eq(tasks.userId, userId));

  // Upcoming due dates (next 7 days, not done/archived)
  const sevenDaysOut = new Date(now);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

  const upcoming = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      status: tasks.status,
      priority: tasks.priority,
      projectId: tasks.projectId,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        ne(tasks.status, "done"),
        ne(tasks.status, "archived"),
        lte(tasks.dueDate, sevenDaysOut),
      )
    )
    .orderBy(tasks.dueDate)
    .limit(10);

  // Recent tasks (last 10 created/updated)
  const recent = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      aiGenerated: tasks.aiGenerated,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.updatedAt))
    .limit(8);

  const statCards = [
    { label: "Total Tasks", value: stats?.total ?? 0, color: "text-gray-900" },
    { label: "To Do", value: stats?.todo ?? 0, color: "text-blue-600" },
    { label: "In Progress", value: stats?.inProgress ?? 0, color: "text-yellow-600" },
    { label: "Done", value: stats?.done ?? 0, color: "text-green-600" },
    { label: "Overdue", value: stats?.overdue ?? 0, color: "text-red-600" },
  ];

  function formatDate(date: Date | null) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function isOverdue(date: Date | null) {
    if (!date) return false;
    return new Date(date) < now;
  }

  const priorityColors: Record<string, string> = {
    low: "text-gray-500",
    medium: "text-blue-600",
    high: "text-orange-600",
    urgent: "text-red-600",
  };

  const statusLabels: Record<string, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
    archived: "Archived",
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
      <p className="mt-1 text-sm text-gray-500">
        Welcome back, {session.user.name}
      </p>

      {/* Stats */}
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Due Dates */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-700">Upcoming Due Dates</h3>
            <Link href="/tasks" className="text-xs text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {upcoming.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                No upcoming deadlines
              </p>
            ) : (
              upcoming.map((task) => (
                <div key={task.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-800">{task.title}</p>
                    <p className={`text-xs ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium ${
                      isOverdue(task.dueDate) ? "text-red-600" : "text-gray-500"
                    }`}
                  >
                    {isOverdue(task.dueDate) ? "Overdue: " : ""}
                    {formatDate(task.dueDate)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-700">Recent Activity</h3>
            <Link href="/tasks" className="text-xs text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recent.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                No tasks yet
              </p>
            ) : (
              recent.map((task) => (
                <div key={task.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-800">
                      {task.title}
                      {task.aiGenerated && (
                        <span className="ml-1.5 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 align-middle">
                          AI
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {statusLabels[task.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Action */}
      <Link
        href="/extract"
        className="mt-6 flex items-center gap-3 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 p-4 transition-colors hover:bg-indigo-50"
      >
        <Sparkles className="h-5 w-5 text-indigo-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-700">Paste & Extract Tasks</p>
          <p className="text-xs text-indigo-500">
            Paste meeting notes or Slack messages to auto-extract action items
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-indigo-400" />
      </Link>
    </div>
  );
}
