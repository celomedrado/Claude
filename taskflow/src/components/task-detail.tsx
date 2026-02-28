"use client";

import { useState, useTransition } from "react";
import { updateTask, deleteTask } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";
import type { TaskItem } from "./task-list";

interface TaskDetailProps {
  task: TaskItem;
  projects: { id: string; name: string; color: string }[];
  onClose: () => void;
}

export function TaskDetail({ task, projects, onClose }: TaskDetailProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [projectId, setProjectId] = useState(task.projectId || "");
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  );

  function handleSave() {
    startTransition(async () => {
      await updateTask(task.id, {
        title,
        description,
        status,
        priority,
        projectId: projectId || null,
        dueDate: dueDate || null,
      });
      onClose();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this task?")) return;
    startTransition(async () => {
      await deleteTask(task.id);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Edit Task</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskItem["status"])}
                className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskItem["priority"])}
                className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="mr-1 h-4 w-4 text-red-500" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
