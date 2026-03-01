/**
 * All Tasks page — loads tasks and projects via IPC.
 */

import { useState, useEffect } from "react";
import { listTasks, listProjects } from "@/lib/api";
import { TasksView } from "@/components/tasks-view";
import type { Task, Project, TaskItem } from "@/lib/types";

export function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  async function loadData() {
    const [allTasks, allProjects] = await Promise.all([listTasks(), listProjects()]);
    setProjects(allProjects);
    const projectMap = new Map(allProjects.map((p) => [p.id, p]));
    setTasks(
      allTasks.map((t) => {
        const project = t.projectId ? projectMap.get(t.projectId) : null;
        return {
          ...t,
          projectName: project?.name ?? null,
          projectColor: project?.color ?? null,
        };
      })
    );
  }

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener("tasks-changed", handler);
    window.addEventListener("projects-changed", handler);
    return () => {
      window.removeEventListener("tasks-changed", handler);
      window.removeEventListener("projects-changed", handler);
    };
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">All Tasks</h2>
      <p className="mt-1 text-sm text-gray-500 mb-6">Every task across all projects</p>
      <TasksView tasks={tasks} projects={projects} />
    </div>
  );
}
