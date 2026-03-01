/**
 * Projects list page — loads projects with task counts via IPC.
 */

import { useState, useEffect } from "react";
import { listProjects, deleteProject } from "@/lib/api";
import { emitDataChanged } from "@/components/app-shell";
import { ProjectForm } from "@/components/project-form";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { Project } from "@/lib/types";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadProjects() {
    const data = await listProjects();
    setProjects(data);
  }

  useEffect(() => {
    loadProjects();
    const handler = () => loadProjects();
    window.addEventListener("projects-changed", handler);
    return () => window.removeEventListener("projects-changed", handler);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
      <p className="mt-1 text-sm text-gray-500">Manage your projects</p>

      <div className="mt-6 space-y-3">
        {projects.map((project) => (
          <div key={project.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            {editingId === project.id ? (
              <div className="flex-1">
                <ProjectForm project={project} onDone={() => setEditingId(null)} />
              </div>
            ) : (
              <>
                <Link to={`/projects/${project.id}`} className="flex items-center gap-3 hover:opacity-80">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                  <div>
                    <p className="font-medium text-gray-900">{project.name}</p>
                    <p className="text-xs text-gray-500">{project.taskCount} task{project.taskCount !== 1 ? "s" : ""}</p>
                  </div>
                </Link>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditingId(project.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={async () => {
                    if (confirm("Delete this project? Tasks will be unassigned.")) {
                      await deleteProject(project.id);
                      emitDataChanged("projects");
                    }
                  }}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}

        {showForm ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <ProjectForm onDone={() => setShowForm(false)} />
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowForm(true)} className="w-full">
            <Plus className="mr-2 h-4 w-4" />New Project
          </Button>
        )}
      </div>
    </div>
  );
}
