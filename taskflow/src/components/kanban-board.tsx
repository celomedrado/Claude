"use client";

import { useState, useCallback, useRef, memo } from "react";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { updateTask, deleteTask, createTask } from "@/actions/tasks";
import { TaskDetail } from "./task-detail";
import type { TaskItem } from "./task-list";
import { cn } from "@/lib/utils";
import { Circle, CheckCircle2, GripVertical, X, Trash2, Eye, EyeOff, Repeat, Plus } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRIORITY_BADGES = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

/* ------------------------------------------------------------------ */
/*  Column — a droppable project lane                                 */
/* ------------------------------------------------------------------ */

const UNASSIGNED_ID = "__unassigned__";

interface ColumnProps {
  id: string;
  label: string;
  color: string;
  tasks: TaskItem[];
  onSelectTask: (task: TaskItem) => void;
  onError: (msg: string) => void;
  isOver: boolean;
}

function Column({ id, label, color, tasks, onSelectTask, onError, isOver }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id });
  const [showAddForm, setShowAddForm] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  async function handleAddTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = addInputRef.current?.value.trim();
    if (!title) return;

    try {
      await createTask({
        title,
        projectId: id === UNASSIGNED_ID ? null : id,
      });
      setShowAddForm(false);
    } catch {
      onError("Failed to create task. Please try again.");
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border bg-gray-50 transition-colors",
        isOver ? "border-indigo-400 bg-indigo-50/40" : "border-gray-200"
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <h3 className="text-sm font-semibold text-gray-700 truncate">{label}</h3>
        <span className="ml-auto shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2 max-h-[calc(100vh-14rem)]">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onSelect={onSelectTask} onError={onError} />
        ))}
        {tasks.length === 0 && !showAddForm && (
          <p className="py-6 text-center text-xs text-gray-400">
            No tasks yet. Drag tasks here or create one to get started.
          </p>
        )}
      </div>

      {/* Add task footer */}
      <div className="border-t border-gray-200 p-2">
        {showAddForm ? (
          <form onSubmit={handleAddTask} className="space-y-1.5">
            <input
              ref={addInputRef}
              type="text"
              placeholder="Task title"
              autoFocus
              className="block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              onKeyDown={(e) => { if (e.key === "Escape") setShowAddForm(false); }}
            />
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Add
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TaskCard — a draggable card within a column                       */
/* ------------------------------------------------------------------ */

const TaskCard = memo(function TaskCard({ task, onSelect, overlay, onError }: { task: TaskItem; onSelect: (t: TaskItem) => void; overlay?: boolean; onError?: (msg: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const isOverdue =
    task.dueDate &&
    task.status !== "done" &&
    task.status !== "archived" &&
    new Date(task.dueDate) < new Date();

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await updateTask(task.id, { status: "done" });
    } catch {
      onError?.("Failed to complete task. Please try again.");
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTask(task.id);
    } catch {
      onError?.("Failed to delete task. Please try again.");
    }
  }

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      className={cn(
        "group relative rounded-md border border-gray-200 bg-white px-3 py-2.5 shadow-sm transition-shadow",
        isDragging && "opacity-30",
        overlay && "shadow-lg ring-2 ring-indigo-300",
        !overlay && "hover:shadow-md"
      )}
    >
      {/* Delete button — visible on hover, top-right corner */}
      {!overlay && (
        <div className="absolute top-1.5 right-1.5 hidden gap-0.5 group-hover:flex">
          <button
            onClick={handleDelete}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete task"
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-start gap-2">
        {/* Complete radio button — always visible */}
        {!overlay && (
          <button
            onClick={handleComplete}
            className={cn(
              "mt-0.5 shrink-0 rounded-full transition-colors",
              task.status === "done"
                ? "text-green-500"
                : "text-gray-300 hover:text-green-400"
            )}
            aria-label={task.status === "done" ? "Completed" : "Mark as done"}
            title={task.status === "done" ? "Completed" : "Mark as done"}
          >
            {task.status === "done" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 shrink-0 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing"
          aria-label="Drag to move task"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Card body — click to open detail */}
        <button onClick={() => onSelect(task)} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <p
              className={cn(
                "text-sm font-medium truncate",
                task.status === "done" && "line-through text-gray-400"
              )}
            >
              {task.title}
            </p>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                PRIORITY_BADGES[task.priority]
              )}
            >
              {task.priority}
            </span>

            {task.dueDate && (
              <span
                className={cn(
                  "text-[10px]",
                  isOverdue ? "text-red-500 font-medium" : "text-gray-400"
                )}
              >
                {isOverdue ? "Overdue" : "Due"}: {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}

            {task.recurrenceRule && (
              <span className="text-purple-500" title="Recurring task">
                <Repeat className="h-3 w-3" />
              </span>
            )}

            {task.aiGenerated && (
              <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                AI
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  KanbanBoard — main board component                                */
/* ------------------------------------------------------------------ */

interface KanbanBoardProps {
  tasks: TaskItem[];
  projects: { id: string; name: string; color: string }[];
}

export function KanbanBoard({ tasks, projects }: KanbanBoardProps) {
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Require a small drag distance before starting — prevents accidental drags on click
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Filter out completed/archived tasks unless the toggle is on
  const visibleTasks = showCompleted
    ? tasks
    : tasks.filter((t) => t.status !== "done" && t.status !== "archived");

  // Build columns: one per project + unassigned
  const columns = [
    ...projects.map((p) => ({
      id: p.id,
      label: p.name,
      color: p.color,
      tasks: visibleTasks.filter((t) => t.projectId === p.id),
    })),
    {
      id: UNASSIGNED_ID,
      label: "Unassigned",
      color: "#9ca3af",
      tasks: visibleTasks.filter((t) => !t.projectId),
    },
  ];

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setError(null);
    setActiveTask(event.active.data.current?.task ?? null);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverColumnId(event.over ? String(event.over.id) : null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveTask(null);
    setOverColumnId(null);

    const { active, over } = event;
    if (!over) return;

    const task = active.data.current?.task;
    if (!task?.id) return;

    const targetColumnId = String(over.id);
    const newProjectId = targetColumnId === UNASSIGNED_ID ? null : targetColumnId;
    const currentProjectId = task.projectId ?? null;

    // Only update if the project actually changed
    if (currentProjectId === newProjectId) return;

    try {
      await updateTask(task.id, { projectId: newProjectId });
    } catch {
      setError("Failed to move task. Please try again.");
    }
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Show completed toggle */}
      <div className="mb-3 flex items-center">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            showCompleted
              ? "bg-indigo-100 text-indigo-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          )}
        >
          {showCompleted ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showCompleted ? "Hide completed" : "Show completed"}
        </button>
      </div>

      {/* Error banner — shown if a drag operation fails */}
      {error && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            color={col.color}
            tasks={col.tasks}
            onSelectTask={setSelectedTask}
            onError={setError}
            isOver={overColumnId === col.id}
          />
        ))}
      </div>

      {/* Drag overlay — shows a floating copy of the card being dragged */}
      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} onSelect={() => {}} overlay />
        ) : null}
      </DragOverlay>

      {/* Task detail modal — same as task-list.tsx */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          projects={projects}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </DndContext>
  );
}
