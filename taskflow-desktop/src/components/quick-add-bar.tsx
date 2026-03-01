/**
 * Quick-add command bar — adapted for Tauri IPC.
 *
 * Changes from original:
 * - createTask import → @/lib/api
 * - Emits "tasks-changed" event on success for data refresh
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { createTask } from "@/lib/api";
import { emitDataChanged } from "./app-shell";
import { parseTaskInput, type ProjectRef, type ParsedTask } from "@/lib/task-parser";
import { cn } from "@/lib/utils";
import { X, Zap, Calendar, Flag, FolderOpen, Repeat } from "lucide-react";

interface QuickAddBarProps {
  projects: ProjectRef[];
  open: boolean;
  onClose: () => void;
}

const PRIORITY_LABELS: Record<string, { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700" },
  high: { label: "High", className: "bg-orange-100 text-orange-700" },
  medium: { label: "Medium", className: "bg-blue-100 text-blue-700" },
  low: { label: "Low", className: "bg-gray-100 text-gray-600" },
};

export function QuickAddBar({ projects, open, onClose }: QuickAddBarProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed: ParsedTask = useMemo(
    () => parseTaskInput(input, projects),
    [input, projects]
  );

  const atMention = useMemo(() => {
    const match = input.match(/(?:^|\s)@(\S*)$/);
    if (!match) return null;
    const query = match[1].toLowerCase();
    const candidates = projects.filter((p) =>
      p.name.toLowerCase().includes(query)
    );
    return candidates.length > 0 ? { query, candidates } : null;
  }, [input, projects]);

  useEffect(() => {
    setAutocompleteIndex(0);
  }, [atMention?.query]);

  useEffect(() => {
    if (open) {
      setInput("");
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (atMention) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAutocompleteIndex((i) =>
          i < atMention.candidates.length - 1 ? i + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAutocompleteIndex((i) =>
          i > 0 ? i - 1 : atMention.candidates.length - 1
        );
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && atMention.candidates.length > 0)) {
        e.preventDefault();
        selectProject(atMention.candidates[autocompleteIndex]);
        return;
      }
    }

    if (e.key === "Enter" && !atMention) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function selectProject(project: ProjectRef) {
    const replaced = input.replace(/(?:^|\s)@\S*$/, ` @${project.name.replace(/\s+/g, "-")}`);
    setInput(replaced + " ");
    inputRef.current?.focus();
  }

  async function handleSubmit() {
    if (!parsed.title.trim() && !input.trim()) return;
    setLoading(true);

    try {
      setError(null);
      await createTask({
        title: parsed.title || input.trim(),
        projectId: parsed.projectId || null,
        priority: parsed.priority || "medium",
        dueDate: parsed.dueDate || null,
        recurrenceRule: parsed.recurrenceRule,
      });
      setInput("");
      emitDataChanged("tasks");
      onClose();
    } catch {
      setError("Failed to create task. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const hasTokens = parsed.priority || parsed.dueDate || parsed.projectId || parsed.recurrenceRule;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[20vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Zap className="h-4 w-4 shrink-0 text-indigo-500" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a task... (@project, p0-p3, tomorrow, every monday)"
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            disabled={loading}
          />
          <button
            onClick={onClose}
            className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {atMention && (
          <div className="border-b border-gray-100 px-2 py-1.5">
            <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Projects
            </p>
            {atMention.candidates.map((p, i) => (
              <button
                key={p.id}
                onClick={() => selectProject(p)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  i === autocompleteIndex
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                {p.name}
              </button>
            ))}
          </div>
        )}

        {hasTokens && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
            {parsed.projectId && (
              <TokenChip
                icon={<FolderOpen className="h-3 w-3" />}
                label={projects.find((p) => p.id === parsed.projectId)?.name || "Project"}
                className="bg-indigo-50 text-indigo-700"
              />
            )}
            {parsed.priority && (
              <TokenChip
                icon={<Flag className="h-3 w-3" />}
                label={PRIORITY_LABELS[parsed.priority].label}
                className={PRIORITY_LABELS[parsed.priority].className}
              />
            )}
            {parsed.dueDate && (
              <TokenChip
                icon={<Calendar className="h-3 w-3" />}
                label={new Date(parsed.dueDate + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                className="bg-emerald-50 text-emerald-700"
              />
            )}
            {parsed.recurrenceRule && (
              <TokenChip
                icon={<Repeat className="h-3 w-3" />}
                label={formatRecurrenceLabel(parsed.recurrenceRule)}
                className="bg-purple-50 text-purple-700"
              />
            )}
          </div>
        )}

        {error && (
          <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2 text-[11px] text-gray-400">
          <span>
            {parsed.title ? (
              <>Task: <span className="font-medium text-gray-600">{parsed.title}</span></>
            ) : (
              "Start typing to create a task"
            )}
          </span>
          <span>
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium">
              Enter
            </kbd>{" "}
            to create
          </span>
        </div>
      </div>
    </div>
  );
}

function TokenChip({
  icon,
  label,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        className
      )}
    >
      {icon}
      {label}
    </span>
  );
}

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

function formatRecurrenceLabel(rule: string): string {
  if (rule === "daily") return "Every day";
  if (rule === "weekdays") return "Every weekday";
  const match = rule.match(/^weekly:(\d)$/);
  if (match) return `Every ${DAY_NAMES[parseInt(match[1], 10)]}`;
  return rule;
}
