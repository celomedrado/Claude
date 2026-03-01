"use client";

import { useState } from "react";
import { updateTask, deleteTask } from "@/actions/tasks";
import { TaskForm } from "./task-form";
import { TaskDetail } from "./task-detail";
import { Button } from "@/components/ui/button";
import { Plus, Circle, Clock, CheckCircle2, Archive, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: Date | null;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
  aiGenerated: boolean;
  createdAt: Date | null;
  recurrenceRule?: string | null;
  sortOrder?: number | null;
}

interface TaskListProps {
  tasks: TaskItem[];
  projects: { id: string; name: string; color: string }[];
  currentProjectId?: string | null;
}

const STATUS_ICONS = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
  archived: Archive,
};

const STATUS_COLORS = {
  todo: "text-gray-400",
  in_progress: "text-yellow-500",
  done: "text-green-500",
  archived: "text-gray-300",
};

const PRIORITY_BADGES = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const NEXT_STATUS: Record<string, TaskItem["status"]> = {
  todo: "in_progress",
  in_progress: "done",
  done: "archived",
  archived: "todo",
};

export function TaskList({ tasks, projects, currentProjectId }: TaskListProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created");

  const filtered = tasks
    .filter((t) => filterStatus === "all" || t.status === filterStatus)
    .filter((t) => filterPriority === "all" || t.priority === filterPriority)
    .sort((a, b) => {
      if (sortBy === "priority") {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      }
      if (sortBy === "due") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  async function cycleStatus(task: TaskItem) {
    try {
      await updateTask(task.id, { status: NEXT_STATUS[task.status] });
    } catch {
      alert("Failed to update task status. Please try again.");
    }
  }

  function formatDate(date: Date | null) {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function isOverdue(task: TaskItem) {
    if (!task.dueDate || task.status === "done" || task.status === "archived") return false;
    return new Date(task.dueDate) < new Date();
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
        >
          <option value="all">All statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
          <option value="archived">Archived</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
        >
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
        >
          <option value="created">Newest first</option>
          <option value="priority">Priority</option>
          <option value="due">Due date</option>
        </select>

        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Task list */}
      <div className="space-y-1">
        {filtered.map((task) => {
          const StatusIcon = STATUS_ICONS[task.status];
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-gray-300 transition-colors"
            >
              <button
                onClick={() => cycleStatus(task)}
                className={cn("shrink-0", STATUS_COLORS[task.status])}
                title={`Status: ${task.status}. Click to advance.`}
              >
                <StatusIcon className="h-5 w-5" />
              </button>

              <button
                onClick={() => setSelectedTask(task)}
                className="flex-1 text-left min-w-0"
              >
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    task.status === "done" && "line-through text-gray-400"
                  )}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {task.projectName && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: task.projectColor || "#6366f1" }}
                      />
                      {task.projectName}
                    </span>
                  )}
                  {task.dueDate && (
                    <span
                      className={cn(
                        "text-xs",
                        isOverdue(task) ? "text-red-500 font-medium" : "text-gray-400"
                      )}
                    >
                      {isOverdue(task) ? "Overdue: " : "Due: "}
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </button>

              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  PRIORITY_BADGES[task.priority]
                )}
              >
                {task.priority}
              </span>

              {task.recurrenceRule && (
                <span className="shrink-0 text-purple-500" title="Recurring task">
                  <Repeat className="h-4 w-4" />
                </span>
              )}

              {task.aiGenerated && (
                <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  AI
                </span>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center py-8 text-sm text-gray-400">
            No tasks found. Create one to get started.
          </p>
        )}
      </div>

      {/* Add task */}
      <div className="mt-4">
        {showForm ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <TaskForm
              projectId={currentProjectId}
              projects={projects}
              onDone={() => setShowForm(false)}
            />
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      {/* Task detail panel */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          projects={projects}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
