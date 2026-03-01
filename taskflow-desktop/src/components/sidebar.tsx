/**
 * Sidebar navigation — adapted from Next.js to React Router.
 *
 * Changes from original:
 * - next/link → react-router-dom Link
 * - usePathname() → useLocation()
 * - Removed signOut() (no auth in desktop v1)
 * - Added Settings nav item
 */

import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ListTodo, Sparkles, FileText, Settings } from "lucide-react";
import type { Project } from "@/lib/types";

export function Sidebar({ projects }: { projects: Pick<Project, "id" | "name" | "color">[] }) {
  const { pathname } = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tasks", label: "All Tasks", icon: ListTodo },
    { href: "/extract", label: "Paste & Extract", icon: Sparkles },
    { href: "/generate", label: "Generate Doc", icon: FileText },
  ];

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <h1 className="text-lg font-bold text-gray-900">TaskFlow</h1>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-4">
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Projects
            </span>
            <Link
              to="/projects"
              className="text-xs text-indigo-600 hover:underline"
            >
              Manage
            </Link>
          </div>
          {projects.length === 0 && (
            <p className="px-3 text-xs text-gray-400">No projects yet</p>
          )}
          {projects.map((project) => {
            const href = `/projects/${project.id}`;
            const active = pathname === href;
            return (
              <Link
                key={project.id}
                to={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                {project.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Settings link at the bottom */}
      <div className="border-t border-gray-200 p-3">
        <Link
          to="/settings"
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100",
            pathname === "/settings" && "bg-indigo-50 text-indigo-700"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
