/**
 * Data layer abstraction — all frontend ↔ Rust IPC calls go through here.
 *
 * Components import from this module instead of calling server actions.
 * Each function maps 1:1 to a Tauri command defined in src-tauri/src/commands/.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ExtractedTask,
  TaskForDoc,
  DocTemplate,
  DashboardData,
  AppSettings,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Tasks                                                              */
/* ------------------------------------------------------------------ */

export async function listTasks(filter?: TaskFilter): Promise<Task[]> {
  return invoke<Task[]>("list_tasks", { filter });
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return invoke<Task>("create_task", { input });
}

export async function updateTask(id: string, updates: UpdateTaskInput): Promise<Task> {
  return invoke<Task>("update_task", { id, updates });
}

export async function deleteTask(id: string): Promise<void> {
  return invoke<void>("delete_task", { id });
}

export async function bulkCreateTasks(tasks: CreateTaskInput[]): Promise<Task[]> {
  return invoke<Task[]>("bulk_create_tasks", { tasks });
}

export async function getDashboard(): Promise<DashboardData> {
  return invoke<DashboardData>("get_dashboard");
}

/* ------------------------------------------------------------------ */
/*  Projects                                                           */
/* ------------------------------------------------------------------ */

export async function listProjects(): Promise<Project[]> {
  return invoke<Project[]>("list_projects");
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return invoke<Project>("create_project", { input });
}

export async function updateProject(id: string, updates: UpdateProjectInput): Promise<Project> {
  return invoke<Project>("update_project", { id, updates });
}

export async function deleteProject(id: string): Promise<void> {
  return invoke<void>("delete_project", { id });
}

/* ------------------------------------------------------------------ */
/*  AI                                                                 */
/* ------------------------------------------------------------------ */

export async function extractTasks(text: string): Promise<ExtractedTask[]> {
  return invoke<ExtractedTask[]>("extract_tasks", { text });
}

export async function generateDocument(tasks: TaskForDoc[], template: DocTemplate): Promise<string> {
  return invoke<string>("generate_document", { tasks, template });
}

export async function categorizeTask(title: string, description: string): Promise<{ project: string; priority: string }> {
  return invoke<{ project: string; priority: string }>("categorize_task", { title, description });
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export async function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_settings");
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  return invoke<AppSettings>("update_settings", { updates });
}

export async function exportDocument(content: string, filename: string): Promise<string> {
  return invoke<string>("export_document", { content, filename });
}

export async function importFromWeb(sourcePath: string): Promise<string> {
  return invoke<string>("import_from_web", { sourcePath });
}
