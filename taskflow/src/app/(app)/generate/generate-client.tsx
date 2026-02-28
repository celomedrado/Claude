"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Check, Copy, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskForDoc {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectName: string | null;
}

type Template = "status_update" | "meeting_brief" | "action_items";

const TEMPLATES: { value: Template; label: string; description: string }[] = [
  {
    value: "status_update",
    label: "Status Update",
    description: "Progress summary with completed, in-progress, and blocked items",
  },
  {
    value: "meeting_brief",
    label: "Meeting Brief",
    description: "Agenda, discussion points, and decisions needed",
  },
  {
    value: "action_items",
    label: "Action Items",
    description: "Clean checklist grouped by project with priorities",
  },
];

export function GenerateClient({ tasks }: { tasks: TaskForDoc[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState<Template>("status_update");
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function toggleTask(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  }

  function selectAll() {
    if (selected.size === tasks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tasks.map((t) => t.id)));
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setDocument("");

    const selectedTasks = tasks.filter((t) => selected.has(t.id));

    try {
      const res = await fetch("/api/ai/generate-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: selectedTasks, template }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await res.json();
      setDocument(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(document);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left: Task selection */}
      <div className="space-y-4">
        {/* Template picker */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">Template</label>
          <div className="grid grid-cols-1 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTemplate(t.value)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  template === t.value
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <p className="text-sm font-medium text-gray-900">{t.label}</p>
                <p className="text-xs text-gray-500">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Task list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-500">
              Tasks ({selected.size}/{tasks.length})
            </label>
            <button onClick={selectAll} className="text-xs text-indigo-600 hover:underline">
              {selected.size === tasks.length ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-1 rounded-lg border border-gray-200 bg-white p-2">
            {tasks.length === 0 && (
              <p className="p-4 text-center text-sm text-gray-400">
                No tasks yet. Create some first.
              </p>
            )}
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  selected.has(task.id)
                    ? "bg-indigo-50 text-indigo-900"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    selected.has(task.id)
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : "border-gray-300"
                  )}
                >
                  {selected.has(task.id) && <Check className="h-3 w-3" />}
                </span>
                <span className="truncate">{task.title}</span>
                {task.projectName && (
                  <span className="ml-auto shrink-0 text-xs text-gray-400">
                    {task.projectName}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading || selected.size === 0}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate Document
            </>
          )}
        </Button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Right: Output */}
      <div>
        {document ? (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
              <span className="text-xs font-medium text-gray-500">Generated Document</span>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <CheckCircle2 className="mr-1 h-3 w-3 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                {document}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 p-8">
            <div className="text-center">
              <FileText className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-400">
                Select tasks and a template, then generate
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
