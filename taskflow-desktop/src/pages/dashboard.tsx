/**
 * Dashboard page — loads data via Tauri IPC.
 *
 * Adapted from the Next.js server component to a client-side page
 * that fetches data on mount.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getDashboard } from "@/lib/api";
import { Sparkles, ArrowRight } from "lucide-react";
import type { DashboardData } from "@/lib/types";

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

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    getDashboard().then(setData).catch(console.error);

    // Refresh when tasks change
    const handler = () => getDashboard().then(setData).catch(console.error);
    window.addEventListener("tasks-changed", handler);
    return () => window.removeEventListener("tasks-changed", handler);
  }, []);

  if (!data) return <div className="text-sm text-gray-400">Loading...</div>;

  const { stats, upcoming, recent } = data;

  const statCards = [
    { label: "Total Tasks", value: stats.total, color: "text-gray-900" },
    { label: "To Do", value: stats.todo, color: "text-blue-600" },
    { label: "In Progress", value: stats.inProgress, color: "text-yellow-600" },
    { label: "Done", value: stats.done, color: "text-green-600" },
    { label: "Overdue", value: stats.overdue, color: "text-red-600" },
  ];

  function formatDate(epoch: number | null) {
    if (!epoch) return "";
    return new Date(epoch * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function isOverdue(epoch: number | null) {
    if (!epoch) return false;
    return epoch * 1000 < Date.now();
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
      <p className="mt-1 text-sm text-gray-500">Welcome back</p>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Due Dates */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-700">Upcoming Due Dates</h3>
            <Link to="/tasks" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {upcoming.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No upcoming deadlines</p>
            ) : (
              upcoming.map((task) => (
                <div key={task.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-800">{task.title}</p>
                    <p className={`text-xs ${priorityColors[task.priority]}`}>{task.priority}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium ${isOverdue(task.dueDate) ? "text-red-600" : "text-gray-500"}`}>
                    {isOverdue(task.dueDate) ? "Overdue: " : ""}{formatDate(task.dueDate)}
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
            <Link to="/tasks" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recent.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No tasks yet</p>
            ) : (
              recent.map((task) => (
                <div key={task.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-800">
                      {task.title}
                      {task.aiGenerated && (
                        <span className="ml-1.5 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 align-middle">AI</span>
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
        to="/extract"
        className="mt-6 flex items-center gap-3 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 p-4 transition-colors hover:bg-indigo-50"
      >
        <Sparkles className="h-5 w-5 text-indigo-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-700">Paste & Extract Tasks</p>
          <p className="text-xs text-indigo-500">Paste meeting notes or Slack messages to auto-extract action items</p>
        </div>
        <ArrowRight className="h-4 w-4 text-indigo-400" />
      </Link>
    </div>
  );
}
