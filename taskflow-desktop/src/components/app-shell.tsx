/**
 * App shell — sidebar + main content + quick-add provider.
 *
 * Adapted from the Next.js server component to a client-side SPA layout.
 * No auth checks — desktop is single-user.
 * Projects are loaded via IPC on mount.
 */

import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { QuickAddProvider } from "./quick-add-provider";
import { listProjects } from "@/lib/api";
import type { Project } from "@/lib/types";

export function AppShell() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    listProjects().then(setProjects).catch(console.error);
  }, []);

  // Re-fetch projects when navigating (covers create/delete)
  // Uses a simple event system — components emit "projects-changed"
  useEffect(() => {
    const handler = () => {
      listProjects().then(setProjects).catch(console.error);
    };
    window.addEventListener("projects-changed", handler);
    window.addEventListener("tasks-changed", handler);
    return () => {
      window.removeEventListener("projects-changed", handler);
      window.removeEventListener("tasks-changed", handler);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar projects={projects} />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
      <QuickAddProvider projects={projects} />
    </div>
  );
}

/** Utility to notify the app shell that data has changed. */
export function emitDataChanged(type: "projects" | "tasks") {
  window.dispatchEvent(new Event(`${type}-changed`));
}
