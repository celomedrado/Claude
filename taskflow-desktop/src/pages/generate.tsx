/**
 * Generate Document page — adapted for Tauri IPC.
 *
 * Changes: uses api.generateDocument instead of fetch,
 * adds export-to-file button via Tauri dialog.
 */

import { useState, useEffect } from "react";
import { listTasks, listProjects, generateDocument, exportDocument } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Check, Copy, CheckCircle2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskForDoc, DocTemplate, Task, Project } from "@/lib/types";

const TEMPLATES: { value: DocTemplate; label: string; description: string }[] = [
  { value: "status_update", label: "Status Update", description: "Progress summary with completed, in-progress, and blocked items" },
  { value: "meeting_brief", label: "Meeting Brief", description: "Agenda, discussion points, and decisions needed" },
  { value: "action_items", label: "Action Items", description: "Clean checklist grouped by project with priorities" },
];

export function GeneratePage() {
  const [allTasks, setAllTasks] = useState<TaskForDoc[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState<DocTemplate>("status_update");
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      const [tasks, projects] = await Promise.all([listTasks(), listProjects()]);
      const projectMap = new Map(projects.map((p) => [p.id, p]));
      setAllTasks(
        tasks.map((t) => {
          const project = t.projectId ? projectMap.get(t.projectId) : null;
          return {
            title: t.title,
            description: t.description || "",
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate ? new Date(t.dueDate * 1000).toISOString().split("T")[0] : null,
            projectName: project?.name ?? null,
          };
        })
      );
    }
    loadData();
  }, []);

  function toggleTask(index: number) {
    const id = String(index);
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function selectAll() {
    if (selected.size === allTasks.length) setSelected(new Set());
    else setSelected(new Set(allTasks.map((_, i) => String(i))));
  }

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setDocument("");
    const selectedTasks = allTasks.filter((_, i) => selected.has(String(i)));
    try {
      const doc = await generateDocument(selectedTasks, template);
      setDocument(doc);
    } catch (err) {
      setError(typeof err === "string" ? err : err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(document);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExport() {
    try {
      await exportDocument(document, `taskflow-${template}.md`);
    } catch {
      // User cancelled — ignore
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Generate Document</h2>
      <p className="mt-1 text-sm text-gray-500 mb-6">
        Select tasks and generate a status update, meeting brief, or action items summary.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Task selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500">Template</label>
            <div className="grid grid-cols-1 gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.value} onClick={() => setTemplate(t.value)} className={cn("rounded-lg border p-3 text-left transition-colors", template === t.value ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300")}>
                  <p className="text-sm font-medium text-gray-900">{t.label}</p>
                  <p className="text-xs text-gray-500">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">Tasks ({selected.size}/{allTasks.length})</label>
              <button onClick={selectAll} className="text-xs text-indigo-600 hover:underline">
                {selected.size === allTasks.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-1 rounded-lg border border-gray-200 bg-white p-2">
              {allTasks.length === 0 && <p className="p-4 text-center text-sm text-gray-400">No tasks yet.</p>}
              {allTasks.map((task, i) => (
                <button key={i} onClick={() => toggleTask(i)} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors", selected.has(String(i)) ? "bg-indigo-50 text-indigo-900" : "text-gray-600 hover:bg-gray-50")}>
                  <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", selected.has(String(i)) ? "border-indigo-500 bg-indigo-500 text-white" : "border-gray-300")}>
                    {selected.has(String(i)) && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{task.title}</span>
                  {task.projectName && <span className="ml-auto shrink-0 text-xs text-gray-400">{task.projectName}</span>}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading || selected.size === 0} className="w-full">
            {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>) : (<><FileText className="mr-2 h-4 w-4" />Generate Document</>)}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Right: Output */}
        <div>
          {document ? (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
                <span className="text-xs font-medium text-gray-500">Generated Document</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={handleExport}>
                    <Download className="mr-1 h-3 w-3" />Export
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? (<><CheckCircle2 className="mr-1 h-3 w-3 text-green-500" />Copied</>) : (<><Copy className="mr-1 h-3 w-3" />Copy</>)}
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">{document}</pre>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 p-8">
              <div className="text-center">
                <FileText className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-400">Select tasks and a template, then generate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
