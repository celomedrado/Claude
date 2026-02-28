"use client";

import { useState } from "react";
import { bulkCreateTasks, type CreateTaskInput } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ExtractedTask {
  title: string;
  description: string;
  suggestedProject: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

const PRIORITY_BADGES = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export function ExtractClient({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [extracted, setExtracted] = useState<ExtractedTask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [projectMap, setProjectMap] = useState<Map<number, string>>(new Map());
  const [saving, setSaving] = useState(false);

  async function handleExtract() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setExtracted([]);

    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Extraction failed");
      }

      const data = await res.json();
      setExtracted(data.tasks);
      setSelected(new Set(data.tasks.map((_: unknown, i: number) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function toggleTask(index: number) {
    const next = new Set(selected);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelected(next);
  }

  function matchProject(suggestedName: string): string | null {
    const lower = suggestedName.toLowerCase();
    const match = projects.find((p) => p.name.toLowerCase() === lower);
    return match?.id || null;
  }

  function setTaskProject(index: number, projectId: string) {
    const next = new Map(projectMap);
    next.set(index, projectId);
    setProjectMap(next);
  }

  async function handleSave() {
    setSaving(true);
    const tasksToCreate: CreateTaskInput[] = extracted
      .filter((_, i) => selected.has(i))
      .map((task, i) => ({
        title: task.title,
        description: task.description,
        projectId: projectMap.get(i) || matchProject(task.suggestedProject),
        priority: task.priority,
        dueDate: task.dueDate,
        sourceText: text,
        aiGenerated: true,
      }));

    await bulkCreateTasks(tasksToCreate);
    setSaving(false);
    router.push("/tasks");
  }

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your meeting notes, Slack messages, email threads, or any text with action items..."
          rows={8}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={handleExtract} disabled={loading || !text.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Extract Tasks
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Results */}
      {extracted.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Extracted {extracted.length} task{extracted.length !== 1 ? "s" : ""} — review and save
            </h3>
            <span className="text-xs text-gray-400">
              {selected.size} selected
            </span>
          </div>

          <div className="space-y-2">
            {extracted.map((task, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border bg-white p-4 shadow-sm transition-colors",
                  selected.has(i)
                    ? "border-indigo-300 bg-indigo-50/30"
                    : "border-gray-200 opacity-50"
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTask(i)}
                    className={cn(
                      "mt-0.5 shrink-0 rounded-md border p-1",
                      selected.has(i)
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-gray-300 text-transparent"
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    {task.description && (
                      <p className="mt-0.5 text-xs text-gray-500">{task.description}</p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          PRIORITY_BADGES[task.priority]
                        )}
                      >
                        {task.priority}
                      </span>

                      {task.dueDate && (
                        <span className="text-xs text-gray-400">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}

                      <select
                        value={projectMap.get(i) || matchProject(task.suggestedProject) || ""}
                        onChange={(e) => setTaskProject(i, e.target.value)}
                        className="ml-auto rounded border border-gray-200 px-2 py-0.5 text-xs"
                      >
                        <option value="">
                          {task.suggestedProject
                            ? `Suggested: ${task.suggestedProject}`
                            : "No project"}
                        </option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setExtracted([]);
                setSelected(new Set());
                setProjectMap(new Map());
              }}
            >
              <X className="mr-1 h-4 w-4" />
              Discard
            </Button>
            <Button onClick={handleSave} disabled={saving || selected.size === 0}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save {selected.size} Task{selected.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {extracted.length === 0 && !loading && text.trim() === "" && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-400">
            Paste text above and click Extract to get started
          </p>
        </div>
      )}
    </div>
  );
}
