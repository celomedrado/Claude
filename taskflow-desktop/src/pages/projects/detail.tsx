/**
 * Project detail page — shows tasks for a specific project.
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { listTasks, listProjects } from "@/lib/api";
import { TaskList } from "@/components/task-list";
import type { Project, TaskItem } from "@/lib/types";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  async function loadData() {
    if (!id) return;
    const [allTasks, allProjects] = await Promise.all([
      listTasks({ projectId: id }),
      listProjects(),
    ]);
    setProjects(allProjects);
    const p = allProjects.find((p) => p.id === id) ?? null;
    setProject(p);
    setTasks(
      allTasks.map((t) => ({
        ...t,
        projectName: p?.name ?? null,
        projectColor: p?.color ?? null,
      }))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!project) return <div className="text-sm text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
        <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        <Link to="/projects" className="hover:underline text-indigo-600">Projects</Link>
        {" / "}{project.name}
      </p>
      <TaskList tasks={tasks} projects={projects} currentProjectId={project.id} />
    </div>
  );
}
