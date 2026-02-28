import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ExtractedTask {
  title: string;
  description: string;
  suggestedProject: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
}

export async function extractTasks(
  rawText: string,
  existingProjects: string[]
): Promise<ExtractedTask[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a task extraction assistant for project managers. Extract actionable tasks from the provided text (meeting notes, Slack messages, etc.).

For each task, provide:
- title: concise action item (start with a verb)
- description: additional context if available
- suggestedProject: best matching project from the list, or a suggested new project name
- priority: low, medium, high, or urgent (infer from context, urgency words, deadlines)
- dueDate: ISO date string if a deadline is mentioned, null otherwise

Existing projects: ${existingProjects.length > 0 ? existingProjects.join(", ") : "none yet"}

Return JSON: { "tasks": [...] }
If no actionable tasks are found, return { "tasks": [] }.`,
      },
      { role: "user", content: rawText },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(content);
  return parsed.tasks || [];
}

export async function categorizeTask(
  title: string,
  description: string,
  existingProjects: string[]
): Promise<{ project: string; priority: "low" | "medium" | "high" | "urgent" }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Given a task title and description, suggest the best matching project and priority level.

Existing projects: ${existingProjects.length > 0 ? existingProjects.join(", ") : "none yet"}

Return JSON: { "project": "project name or empty string", "priority": "low|medium|high|urgent" }`,
      },
      { role: "user", content: `Title: ${title}\nDescription: ${description}` },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return { project: "", priority: "medium" };

  return JSON.parse(content);
}

export type DocTemplate = "status_update" | "meeting_brief" | "action_items";

const DOC_PROMPTS: Record<DocTemplate, string> = {
  status_update: `Generate a concise project status update from these tasks. Include:
- Summary of progress
- What's been completed
- What's in progress
- Blockers or overdue items
- Next steps
Format as clean markdown.`,

  meeting_brief: `Generate a meeting brief document from these tasks. Include:
- Agenda items derived from active tasks
- Key discussion points
- Decisions needed (for high/urgent priority items)
- Action items with owners
Format as clean markdown.`,

  action_items: `Generate a clean action items summary from these tasks. Include:
- Grouped by project (if applicable)
- Each item with priority indicator and due date
- Overdue items highlighted at the top
Format as clean markdown checklist.`,
};

export async function generateDocument(
  tasks: { title: string; description: string; status: string; priority: string; dueDate: string | null; projectName: string | null }[],
  template: DocTemplate
): Promise<string> {
  const taskList = tasks
    .map(
      (t) =>
        `- [${t.status}] ${t.title} (priority: ${t.priority}${t.dueDate ? `, due: ${t.dueDate}` : ""}${t.projectName ? `, project: ${t.projectName}` : ""}): ${t.description || "no description"}`
    )
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: DOC_PROMPTS[template] },
      { role: "user", content: `Tasks:\n${taskList}` },
    ],
  });

  return response.choices[0]?.message?.content || "Failed to generate document.";
}
