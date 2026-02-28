"use client";

import { useState } from "react";
import { createTask, type CreateTaskInput } from "@/actions/tasks";
import { Button } from "@/components/ui/button";

interface TaskFormProps {
  projectId?: string | null;
  projects: { id: string; name: string; color: string }[];
  onDone?: () => void;
}

export function TaskForm({ projectId, projects, onDone }: TaskFormProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const input: CreateTaskInput = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      projectId: (formData.get("projectId") as string) || null,
      priority: (formData.get("priority") as CreateTaskInput["priority"]) || "medium",
      dueDate: (formData.get("dueDate") as string) || null,
    };

    await createTask(input);
    setLoading(false);
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        name="title"
        type="text"
        required
        placeholder="Task title"
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      <textarea
        name="description"
        placeholder="Description (optional)"
        rows={2}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
          <select
            name="projectId"
            defaultValue={projectId || ""}
            className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
          <select
            name="priority"
            defaultValue="medium"
            className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Due date</label>
          <input
            name="dueDate"
            type="date"
            className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Task"}
        </Button>
      </div>
    </form>
  );
}
