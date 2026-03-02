/**
 * Kanban board with drag-and-drop — adapted for Tauri IPC.
 *
 * Supports:
 * - Dragging task cards within and between columns (vertical sort)
 * - Dragging project columns to reorder them (horizontal sort)
 * - "Unassigned" column is always last and not draggable
 */

import { useState, useCallback, useRef, memo, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { updateTask, deleteTask, createTask, updateProject } from "@/lib/api";
import { emitDataChanged } from "./app-shell";
import { TaskDetail } from "./task-detail";
import { cn } from "@/lib/utils";
import { Circle, CheckCircle2, GripVertical, GripHorizontal, X, Trash2, Eye, EyeOff, Repeat, Plus } from "lucide-react";
import type { TaskItem, Project } from "@/lib/types";

const PRIORITY_BADGES = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const UNASSIGNED_ID = "__unassigned__";
const COLUMN_PREFIX = "column:";

function computeSortOrder(prev: number | null, next: number | null): number {
  if (prev != null && next != null) return (prev + next) / 2;
  if (prev != null) return prev + 1;
  if (next != null) return next / 2;
  return 0;
}

function getColumnId(task: TaskItem): string {
  return task.projectId || UNASSIGNED_ID;
}

function isColumnId(id: string): boolean {
  return id.startsWith(COLUMN_PREFIX);
}

function toColumnSortableId(projectId: string): string {
  return COLUMN_PREFIX + projectId;
}

function fromColumnSortableId(sortableId: string): string {
  return sortableId.slice(COLUMN_PREFIX.length);
}

/* ------------------------------------------------------------------ */
/*  Column                                                             */
/* ------------------------------------------------------------------ */

interface ColumnProps {
  id: string;
  label: string;
  color: string;
  tasks: TaskItem[];
  onSelectTask: (task: TaskItem) => void;
  onError: (msg: string) => void;
  isOver: boolean;
  columnDragListeners?: SyntheticListenerMap;
  columnDragAttributes?: React.HTMLAttributes<HTMLElement> & { role?: string; tabIndex?: number };
}

function Column({ id, label, color, tasks, onSelectTask, onError, isOver, columnDragListeners, columnDragAttributes }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id });
  const [showAddForm, setShowAddForm] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  async function handleAddTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = addInputRef.current?.value.trim();
    if (!title) return;

    const maxSort = tasks.length > 0
      ? Math.max(...tasks.map((t) => t.sortOrder ?? 0))
      : 0;

    try {
      await createTask({
        title,
        projectId: id === UNASSIGNED_ID ? null : id,
        sortOrder: maxSort + 1,
      });
      emitDataChanged("tasks");
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
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5">
        {columnDragListeners && (
          <button
            {...columnDragListeners}
            {...columnDragAttributes}
            className="shrink-0 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing"
            aria-label="Drag to reorder column"
          >
            <GripHorizontal className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-semibold text-gray-700 truncate">{label}</h3>
        <span className="ml-auto shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">{tasks.length}</span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 overflow-y-auto p-2 max-h-[calc(100vh-14rem)]">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onSelect={onSelectTask} onError={onError} />
          ))}
          {tasks.length === 0 && !showAddForm && (
            <p className="py-6 text-center text-xs text-gray-400">No tasks yet.</p>
          )}
        </div>
      </SortableContext>

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
              <button type="button" onClick={() => setShowAddForm(false)} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">Cancel</button>
              <button type="submit" className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700">Add</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />Add task
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SortableColumn — wraps Column for horizontal column reorder        */
/* ------------------------------------------------------------------ */

function SortableColumn(props: Omit<ColumnProps, "columnDragListeners" | "columnDragAttributes"> & { sortableId: string }) {
  const { sortableId, ...columnProps } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    data: { type: "column", projectId: fromColumnSortableId(sortableId) },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Column {...columnProps} columnDragListeners={listeners} columnDragAttributes={attributes} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SortableTaskCard                                                   */
/* ------------------------------------------------------------------ */

const SortableTaskCard = memo(function SortableTaskCard({ task, onSelect, onError }: { task: TaskItem; onSelect: (t: TaskItem) => void; onError?: (msg: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task, columnId: getColumnId(task) },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCardContent task={task} onSelect={onSelect} onError={onError} isDragging={isDragging} listeners={listeners} attributes={attributes} />
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  TaskCardContent                                                    */
/* ------------------------------------------------------------------ */

const TaskCardContent = memo(function TaskCardContent({
  task, onSelect, overlay, onError, isDragging, listeners, attributes,
}: {
  task: TaskItem;
  onSelect: (t: TaskItem) => void;
  overlay?: boolean;
  onError?: (msg: string) => void;
  isDragging?: boolean;
  listeners?: SyntheticListenerMap;
  attributes?: React.HTMLAttributes<HTMLElement> & { role?: string; tabIndex?: number };
}) {
  const isOverdue = task.dueDate && task.status !== "done" && task.status !== "archived" && task.dueDate * 1000 < Date.now();

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await updateTask(task.id, { status: "done" });
      emitDataChanged("tasks");
    } catch {
      onError?.("Failed to complete task.");
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTask(task.id);
      emitDataChanged("tasks");
    } catch {
      onError?.("Failed to delete task.");
    }
  }

  return (
    <div className={cn(
      "group relative rounded-md border border-gray-200 bg-white px-3 py-2.5 shadow-sm transition-shadow",
      isDragging && "opacity-30",
      overlay && "shadow-lg ring-2 ring-indigo-300",
      !overlay && "hover:shadow-md"
    )}>
      {!overlay && (
        <div className="absolute top-1.5 right-1.5 hidden gap-0.5 group-hover:flex">
          <button onClick={handleDelete} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete task">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-start gap-2">
        {!overlay && (
          <button onClick={handleComplete} className={cn("mt-0.5 shrink-0 rounded-full transition-colors", task.status === "done" ? "text-green-500" : "text-gray-300 hover:text-green-400")} aria-label={task.status === "done" ? "Completed" : "Mark as done"}>
            {task.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          </button>
        )}
        <button {...listeners} {...attributes} className="mt-0.5 shrink-0 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing" aria-label="Drag to move task">
          <GripVertical className="h-4 w-4" />
        </button>
        <button onClick={() => onSelect(task)} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={cn("text-sm font-medium truncate", task.status === "done" && "line-through text-gray-400")}>{task.title}</p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", PRIORITY_BADGES[task.priority])}>{task.priority}</span>
            {task.dueDate && (
              <span className={cn("text-[10px]", isOverdue ? "text-red-500 font-medium" : "text-gray-400")}>
                {isOverdue ? "Overdue" : "Due"}: {new Date(task.dueDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            {task.recurrenceRule && <span className="text-purple-500" title="Recurring task"><Repeat className="h-3 w-3" /></span>}
            {task.aiGenerated && <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">AI</span>}
          </div>
        </button>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  KanbanBoard                                                        */
/* ------------------------------------------------------------------ */

interface KanbanBoardProps {
  tasks: TaskItem[];
  projects: Pick<Project, "id" | "name" | "color" | "displayOrder">[];
}

export function KanbanBoard({ tasks: propTasks, projects: propProjects }: KanbanBoardProps) {
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Local state for optimistic updates
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(propTasks);
  const [prevPropTasks, setPrevPropTasks] = useState(propTasks);
  const [localProjects, setLocalProjects] = useState(propProjects);
  const [prevPropProjects, setPrevPropProjects] = useState(propProjects);

  if (propTasks !== prevPropTasks) {
    setPrevPropTasks(propTasks);
    setLocalTasks(propTasks);
  }
  if (propProjects !== prevPropProjects) {
    setPrevPropProjects(propProjects);
    setLocalProjects(propProjects);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleTasks = showCompleted
    ? localTasks
    : localTasks.filter((t) => t.status !== "done" && t.status !== "archived");

  // Sort projects by displayOrder for column rendering
  const sortedProjects = useMemo(
    () => [...localProjects].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [localProjects],
  );

  const columns = useMemo(() => [
    ...sortedProjects.map((p) => ({
      id: p.id, label: p.name, color: p.color,
      tasks: visibleTasks.filter((t) => t.projectId === p.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    })),
    {
      id: UNASSIGNED_ID, label: "Unassigned", color: "#9ca3af",
      tasks: visibleTasks.filter((t) => !t.projectId).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    },
  ], [sortedProjects, visibleTasks]);

  // Column sortable IDs (for horizontal SortableContext) — exclude Unassigned
  const columnSortableIds = useMemo(
    () => sortedProjects.map((p) => toColumnSortableId(p.id)),
    [sortedProjects],
  );

  function findColumn(taskId: string) {
    for (const col of columns) {
      const index = col.tasks.findIndex((t) => t.id === taskId);
      if (index !== -1) return { col, index };
    }
    return null;
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setError(null);
    const data = event.active.data.current;
    if (data?.type === "column") {
      setActiveColumnId(data.projectId);
      setActiveTask(null);
    } else {
      setActiveTask(data?.task ?? null);
      setActiveColumnId(null);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, active } = event;
    // Only highlight columns for task drags, not column drags
    if (active.data.current?.type === "column") return;
    if (!over) { setOverColumnId(null); return; }
    const overIdStr = String(over.id);
    if (isColumnId(overIdStr)) return; // Hovering over a column sortable — ignore for task DnD
    const isCol = sortedProjects.some((p) => p.id === overIdStr) || overIdStr === UNASSIGNED_ID;
    if (isCol) { setOverColumnId(overIdStr); } else {
      const overData = over.data.current;
      if (overData?.columnId) setOverColumnId(overData.columnId);
    }
  }, [sortedProjects]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const data = event.active.data.current;

    // Column reorder
    if (data?.type === "column") {
      setActiveColumnId(null);
      const { active, over } = event;
      if (!over) return;
      const activeId = fromColumnSortableId(String(active.id));
      const overId = isColumnId(String(over.id))
        ? fromColumnSortableId(String(over.id))
        : String(over.id);
      if (activeId === overId) return;

      const oldIndex = sortedProjects.findIndex((p) => p.id === activeId);
      const newIndex = sortedProjects.findIndex((p) => p.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      // Compute new displayOrder using fractional indexing
      const reordered = sortedProjects.filter((p) => p.id !== activeId);
      const prev = newIndex > 0 ? reordered[newIndex - 1] : null;
      const next = newIndex < reordered.length ? reordered[newIndex] : null;
      const newDisplayOrder = computeSortOrder(
        prev ? (prev.displayOrder ?? 0) : null,
        next ? (next.displayOrder ?? 0) : null,
      );

      // Optimistic update
      setLocalProjects((prev) =>
        prev.map((p) => p.id === activeId ? { ...p, displayOrder: newDisplayOrder } : p)
      );

      try {
        await updateProject(activeId, { displayOrder: newDisplayOrder });
        emitDataChanged("projects");
      } catch {
        setLocalProjects(propProjects);
        setError("Failed to reorder column. Please try again.");
      }
      return;
    }

    // Task reorder (existing logic)
    setActiveTask(null);
    setOverColumnId(null);
    const { active, over } = event;
    if (!over) return;
    const activeTaskData = active.data.current?.task as TaskItem | undefined;
    if (!activeTaskData?.id) return;
    const activeId = activeTaskData.id;
    const overId = String(over.id);

    // Skip if over a column sortable
    if (isColumnId(overId)) return;

    const source = findColumn(activeId);
    if (!source) return;
    const isOverColumn = sortedProjects.some((p) => p.id === overId) || overId === UNASSIGNED_ID;
    let targetColumnId: string;
    let targetIndex: number;
    if (isOverColumn) {
      targetColumnId = overId;
      const targetCol = columns.find((c) => c.id === targetColumnId);
      targetIndex = targetCol ? targetCol.tasks.length : 0;
    } else {
      const target = findColumn(overId);
      if (!target) return;
      targetColumnId = target.col.id;
      targetIndex = target.index;
    }
    const sourceColumnId = source.col.id;
    const sourceIndex = source.index;
    if (sourceColumnId === targetColumnId && sourceIndex === targetIndex) return;
    const newProjectId = targetColumnId === UNASSIGNED_ID ? null : targetColumnId;
    const isCrossColumn = sourceColumnId !== targetColumnId;
    let colTasks = columns.find((c) => c.id === targetColumnId)?.tasks.slice() ?? [];
    if (!isCrossColumn) colTasks = colTasks.filter((t) => t.id !== activeId);
    const prevTask = targetIndex > 0 ? colTasks[targetIndex - 1] : null;
    const nextTask = targetIndex < colTasks.length ? colTasks[targetIndex] : null;
    const newSortOrder = computeSortOrder(
      prevTask ? (prevTask.sortOrder ?? 0) : null,
      nextTask ? (nextTask.sortOrder ?? 0) : null,
    );
    setLocalTasks((prev) =>
      prev.map((t) => t.id === activeId ? { ...t, projectId: newProjectId, sortOrder: newSortOrder } : t)
    );
    try {
      const updates: Record<string, unknown> = { sortOrder: newSortOrder };
      if (isCrossColumn) updates.projectId = newProjectId;
      await updateTask(activeId, updates as Parameters<typeof updateTask>[1]);
      emitDataChanged("tasks");
    } catch {
      setLocalTasks(propTasks);
      setError("Failed to move task. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, sortedProjects, propTasks, propProjects]);

  // Find the active column data for the drag overlay
  const activeColumnData = activeColumnId
    ? columns.find((c) => c.id === activeColumnId)
    : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="mb-3 flex items-center">
        <button onClick={() => setShowCompleted(!showCompleted)} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors", showCompleted ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700")}>
          {showCompleted ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showCompleted ? "Hide completed" : "Show completed"}
        </button>
      </div>
      {error && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}
      <SortableContext items={columnSortableIds} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {sortedProjects.map((p) => {
            const col = columns.find((c) => c.id === p.id)!;
            return (
              <SortableColumn
                key={p.id}
                sortableId={toColumnSortableId(p.id)}
                id={col.id}
                label={col.label}
                color={col.color}
                tasks={col.tasks}
                onSelectTask={setSelectedTask}
                onError={setError}
                isOver={overColumnId === col.id}
              />
            );
          })}
          {/* Unassigned column — not sortable, always last */}
          {(() => {
            const unassigned = columns.find((c) => c.id === UNASSIGNED_ID)!;
            return (
              <Column
                id={unassigned.id}
                label={unassigned.label}
                color={unassigned.color}
                tasks={unassigned.tasks}
                onSelectTask={setSelectedTask}
                onError={setError}
                isOver={overColumnId === UNASSIGNED_ID}
              />
            );
          })()}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeTask ? (
          <TaskCardContent task={activeTask} onSelect={() => {}} overlay />
        ) : activeColumnData ? (
          <div className="flex w-72 shrink-0 flex-col rounded-lg border border-indigo-300 bg-gray-50 shadow-lg ring-2 ring-indigo-200 opacity-80">
            <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: activeColumnData.color }} />
              <h3 className="text-sm font-semibold text-gray-700 truncate">{activeColumnData.label}</h3>
              <span className="ml-auto shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">{activeColumnData.tasks.length}</span>
            </div>
            <div className="p-2 text-center text-xs text-gray-400">
              {activeColumnData.tasks.length} task{activeColumnData.tasks.length !== 1 ? "s" : ""}
            </div>
          </div>
        ) : null}
      </DragOverlay>
      {selectedTask && <TaskDetail task={selectedTask} projects={localProjects} onClose={() => setSelectedTask(null)} />}
    </DndContext>
  );
}
