/**
 * Shared TypeScript types for the TaskFlow desktop app.
 * These mirror the Rust models and are (de)serialized over Tauri IPC.
 */

/* ------------------------------------------------------------------ */
/*  Task                                                               */
/* ------------------------------------------------------------------ */

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  projectId: string | null;
  dueDate: number | null;
  sourceText: string | null;
  aiGenerated: boolean;
  sortOrder: number;
  recurrenceRule: string | null;
  recurrenceSourceId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  projectId?: string | null;
  priority?: Task["priority"];
  dueDate?: string | null;
  status?: Task["status"];
  sourceText?: string | null;
  aiGenerated?: boolean;
  recurrenceRule?: string | null;
  recurrenceSourceId?: string | null;
  sortOrder?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  projectId?: string | null;
  priority?: Task["priority"];
  dueDate?: string | null;
  status?: Task["status"];
  sortOrder?: number;
}

export interface TaskFilter {
  status?: string;
  priority?: string;
  projectId?: string;
}

/* ------------------------------------------------------------------ */
/*  Task view item (enriched with project details for display)         */
/* ------------------------------------------------------------------ */

export interface TaskItem extends Task {
  projectName: string | null;
  projectColor: string | null;
}

/* ------------------------------------------------------------------ */
/*  Project                                                            */
/* ------------------------------------------------------------------ */

export interface Project {
  id: string;
  name: string;
  color: string;
  displayOrder: number;
  taskCount: number;
  createdAt: number;
}

export interface CreateProjectInput {
  name: string;
  color?: string;
}

export interface UpdateProjectInput {
  name?: string;
  color?: string;
  displayOrder?: number;
}

/* ------------------------------------------------------------------ */
/*  AI                                                                 */
/* ------------------------------------------------------------------ */

export interface ExtractedTask {
  title: string;
  description: string;
  suggestedProject: string;
  priority: Task["priority"];
  dueDate: string | null;
}

export interface TaskForDoc {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectName: string | null;
}

export type DocTemplate = "status_update" | "meeting_brief" | "action_items";

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

export interface DashboardStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

export interface DashboardData {
  stats: DashboardStats;
  upcoming: Task[];
  recent: Task[];
}

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */

export interface AppSettings {
  openaiApiKey: string | null;
  autoLaunch: boolean;
  notificationsEnabled: boolean;
  globalHotkey: string;
  checkOverdueIntervalMin: number;
}
