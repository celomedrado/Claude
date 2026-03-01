/**
 * Project create/edit form — adapted for Tauri IPC.
 */

import { useState } from "react";
import { createProject, updateProject } from "@/lib/api";
import { emitDataChanged } from "./app-shell";
import { Button } from "@/components/ui/button";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

interface ProjectFormProps {
  project?: { id: string; name: string; color: string } | null;
  onDone?: () => void;
}

export function ProjectForm({ project, onDone }: ProjectFormProps) {
  const [color, setColor] = useState(project?.color || COLORS[0]);
  const [name, setName] = useState(project?.name || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      if (project) {
        await updateProject(project.id, { name: name.trim(), color });
      } else {
        await createProject({ name: name.trim(), color });
      }
      emitDataChanged("projects");
      onDone?.();
    } catch {
      alert("Failed to save project. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="project-name" className="block text-sm font-medium text-gray-700">
          Project name
        </label>
        <input
          id="project-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="e.g. Product Launch"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full border-2 transition-all ${
                color === c ? "border-gray-900 scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        )}
        <Button type="submit" disabled={loading}>
          {project ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}
