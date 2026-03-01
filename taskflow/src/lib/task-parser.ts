/**
 * Smart task input parser.
 *
 * Parses a single-line task description and extracts structured fields:
 *  - Priority:   "p0" (urgent), "p1" (high), "p2" (medium), "p3" (low)
 *  - Due date:   "today", "tomorrow", "next monday" … "next sunday"
 *  - Recurrence: "every monday" … "every sunday", "every day", "every weekday"
 *  - Project:    "@projectName" — matched against the user's project list
 *
 * Remaining text (with matched tokens stripped) becomes the task title.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProjectRef {
  id: string;
  name: string;
}

export interface ParsedTask {
  title: string;
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: string; // ISO date string (YYYY-MM-DD)
  recurrenceRule?: string; // e.g. "weekly:1", "daily", "weekdays"
  projectId?: string;
  /** Raw project query when multiple matches exist (for autocomplete) */
  projectQuery?: string;
  /** Matched project candidates when >1 match (for autocomplete) */
  projectMatches?: ProjectRef[];
}

/* ------------------------------------------------------------------ */
/*  Priority mapping                                                   */
/* ------------------------------------------------------------------ */

const PRIORITY_MAP: Record<string, ParsedTask["priority"]> = {
  p0: "urgent",
  p1: "high",
  p2: "medium",
  p3: "low",
};

/** Matches standalone "p0" … "p3" tokens (case-insensitive) */
const PRIORITY_RE = /\b(p[0-3])\b/i;

/* ------------------------------------------------------------------ */
/*  Day helpers                                                        */
/* ------------------------------------------------------------------ */

const DAY_NAMES = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
] as const;

/** Map day name → JS Date dayOfWeek index (0 = Sunday) */
function dayIndex(name: string): number {
  return DAY_NAMES.indexOf(name.toLowerCase() as typeof DAY_NAMES[number]);
}

/**
 * Returns the ISO date string for the next occurrence of the given weekday.
 * If today is that weekday, returns 7 days from now (i.e. next week).
 */
function nextOccurrence(dayOfWeek: number, from: Date = new Date()): string {
  const today = from.getDay();
  let diff = dayOfWeek - today;
  if (diff <= 0) diff += 7; // always forward, never today
  const target = new Date(from);
  target.setDate(target.getDate() + diff);
  return formatISODate(target);
}

function formatISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* ------------------------------------------------------------------ */
/*  Date parsing                                                       */
/* ------------------------------------------------------------------ */

/** Matches "today", "tomorrow", "next monday" … "next sunday" */
const DATE_RE = new RegExp(
  `\\b(today|tomorrow|next\\s+(${DAY_NAMES.join("|")}))\\b`,
  "i"
);

function parseDate(text: string): { dueDate: string; matched: string } | null {
  const match = text.match(DATE_RE);
  if (!match) return null;

  const token = match[0].toLowerCase();
  const now = new Date();

  if (token === "today") {
    return { dueDate: formatISODate(now), matched: match[0] };
  }

  if (token === "tomorrow") {
    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    return { dueDate: formatISODate(tmrw), matched: match[0] };
  }

  // "next <day>"
  const dayName = match[2];
  const idx = dayIndex(dayName);
  if (idx === -1) return null;

  return { dueDate: nextOccurrence(idx, now), matched: match[0] };
}

/* ------------------------------------------------------------------ */
/*  Recurrence parsing                                                 */
/* ------------------------------------------------------------------ */

/** Matches "every monday" … "every sunday", "every day", "every weekday" */
const RECURRENCE_RE = new RegExp(
  `\\bevery\\s+(${DAY_NAMES.join("|")}|day|weekday)\\b`,
  "i"
);

function parseRecurrence(
  text: string
): { recurrenceRule: string; dueDate: string; matched: string } | null {
  const match = text.match(RECURRENCE_RE);
  if (!match) return null;

  const token = match[1].toLowerCase();
  const now = new Date();

  if (token === "day") {
    // Daily — next due date is tomorrow
    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    return { recurrenceRule: "daily", dueDate: formatISODate(tmrw), matched: match[0] };
  }

  if (token === "weekday") {
    // Monday through Friday
    const dow = now.getDay();
    let daysUntil: number;
    if (dow >= 5) {
      // Saturday(5) or Sunday(6) → next Monday
      daysUntil = dow === 5 ? 3 : dow === 6 ? 2 : 1;
    } else {
      daysUntil = 1; // next weekday is tomorrow
    }
    const next = new Date(now);
    next.setDate(next.getDate() + daysUntil);
    return { recurrenceRule: "weekdays", dueDate: formatISODate(next), matched: match[0] };
  }

  // "every <dayname>" → weekly on that day
  const idx = dayIndex(token);
  if (idx === -1) return null;
  return {
    recurrenceRule: `weekly:${idx}`,
    dueDate: nextOccurrence(idx, now),
    matched: match[0],
  };
}

/* ------------------------------------------------------------------ */
/*  Project mention parsing                                            */
/* ------------------------------------------------------------------ */

/** Matches @word — single contiguous token (no spaces) */
const PROJECT_RE = /(?:^|\s)@(\S+)/i;

function parseProject(
  text: string,
  projects: ProjectRef[]
): { projectId?: string; projectQuery?: string; projectMatches?: ProjectRef[]; matched: string } | null {
  const match = text.match(PROJECT_RE);
  if (!match) return null;

  const query = match[1].toLowerCase();
  const matched = match[0].trimStart(); // the full "@word" token

  // Find projects whose name contains the query (case-insensitive)
  const candidates = projects.filter((p) =>
    p.name.toLowerCase().includes(query)
  );

  if (candidates.length === 1) {
    return { projectId: candidates[0].id, matched };
  }

  if (candidates.length > 1) {
    return { projectQuery: query, projectMatches: candidates, matched };
  }

  // No match — leave the @mention in the title
  return null;
}

/* ------------------------------------------------------------------ */
/*  Main parser                                                        */
/* ------------------------------------------------------------------ */

/**
 * Parses a raw task input string and extracts structured fields.
 *
 * Order of extraction: recurrence → date → priority → project.
 * Recurrence takes precedence over date (since "every monday" also implies a due date).
 */
export function parseTaskInput(text: string, projects: ProjectRef[]): ParsedTask {
  let remaining = text;
  const result: ParsedTask = { title: "" };

  // 1. Recurrence (must be checked before date, since both can set dueDate)
  const recurrence = parseRecurrence(remaining);
  if (recurrence) {
    result.recurrenceRule = recurrence.recurrenceRule;
    result.dueDate = recurrence.dueDate;
    remaining = remaining.replace(recurrence.matched, " ");
  }

  // 2. Date (only if recurrence didn't already set a due date)
  if (!result.dueDate) {
    const date = parseDate(remaining);
    if (date) {
      result.dueDate = date.dueDate;
      remaining = remaining.replace(date.matched, " ");
    }
  }

  // 3. Priority
  const priorityMatch = remaining.match(PRIORITY_RE);
  if (priorityMatch) {
    result.priority = PRIORITY_MAP[priorityMatch[1].toLowerCase()];
    remaining = remaining.replace(priorityMatch[0], " ");
  }

  // 4. Project mention
  const project = parseProject(remaining, projects);
  if (project) {
    result.projectId = project.projectId;
    result.projectQuery = project.projectQuery;
    result.projectMatches = project.projectMatches;
    remaining = remaining.replace(project.matched, " ");
  }

  // Clean up the remaining text → task title
  result.title = remaining.replace(/\s+/g, " ").trim();

  return result;
}

/* ------------------------------------------------------------------ */
/*  Recurrence helpers (used by server actions)                        */
/* ------------------------------------------------------------------ */

/**
 * Given a recurrence rule, calculates the next due date from a reference date.
 * Used when completing a recurring task to schedule the next occurrence.
 */
export function getNextDueDate(rule: string, from: Date = new Date()): string {
  if (rule === "daily") {
    const next = new Date(from);
    next.setDate(next.getDate() + 1);
    return formatISODate(next);
  }

  if (rule === "weekdays") {
    const next = new Date(from);
    const dow = next.getDay();
    // Skip to the next weekday
    const daysUntil = dow === 5 ? 3 : dow === 6 ? 2 : 1;
    next.setDate(next.getDate() + daysUntil);
    return formatISODate(next);
  }

  // "weekly:N" where N is the day-of-week index
  const weeklyMatch = rule.match(/^weekly:(\d)$/);
  if (weeklyMatch) {
    const targetDay = parseInt(weeklyMatch[1], 10);
    return nextOccurrence(targetDay, from);
  }

  // Fallback: tomorrow
  const fallback = new Date(from);
  fallback.setDate(fallback.getDate() + 1);
  return formatISODate(fallback);
}
