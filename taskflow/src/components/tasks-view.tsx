"use client";

import { useState } from "react";
import { TaskList, type TaskItem } from "./task-list";
import { KanbanBoard } from "./kanban-board";
import { List, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "board";

interface TasksViewProps {
  tasks: TaskItem[];
  projects: { id: string; name: string; color: string; displayOrder: number | null }[];
}

export function TasksView({ tasks, projects }: TasksViewProps) {
  const [view, setView] = useState<ViewMode>("board");

  return (
    <div>
      {/* View toggle */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setView("list")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            view === "list"
              ? "bg-indigo-100 text-indigo-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          )}
        >
          <List className="h-3.5 w-3.5" />
          List
        </button>
        <button
          onClick={() => setView("board")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            view === "board"
              ? "bg-indigo-100 text-indigo-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          )}
        >
          <Columns3 className="h-3.5 w-3.5" />
          Board
        </button>
      </div>

      {/* Render selected view */}
      {view === "list" ? (
        <TaskList tasks={tasks} projects={projects} />
      ) : (
        <KanbanBoard tasks={tasks} projects={projects} />
      )}
    </div>
  );
}
