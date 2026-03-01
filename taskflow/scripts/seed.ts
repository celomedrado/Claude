import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { users, projects, tasks, meetings } from "../src/db/schema";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(path.join(dataDir, "taskflow.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Apply all migrations in order
const drizzleDir = path.join(process.cwd(), "drizzle");
const migrationFiles = fs.readdirSync(drizzleDir).filter((f) => f.endsWith(".sql")).sort();
for (const file of migrationFiles) {
  const migration = fs.readFileSync(path.join(drizzleDir, file), "utf-8");
  const statements = migration.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      sqlite.exec(stmt);
    } catch {
      // Table/column already exists, skip
    }
  }
}

const db = drizzle(sqlite);

async function seed() {
  console.log("Seeding database...");

  // Create demo user
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const [user] = await db
    .insert(users)
    .values({
      email: "demo@taskflow.app",
      passwordHash,
      name: "Demo User",
    })
    .returning();

  console.log(`Created user: ${user.email} (password: demo1234)`);

  // Create projects
  const projectData = [
    { name: "Product Launch", color: "#6366f1" },
    { name: "Q1 Planning", color: "#22c55e" },
    { name: "Customer Feedback", color: "#f97316" },
    { name: "Infrastructure", color: "#06b6d4" },
  ];

  const createdProjects = await db
    .insert(projects)
    .values(projectData.map((p) => ({ ...p, userId: user.id })))
    .returning();

  console.log(`Created ${createdProjects.length} projects`);

  // Create tasks
  const now = new Date();
  const dayMs = 86400000;

  const taskData = [
    {
      title: "Finalize landing page copy",
      description: "Review and approve the hero section, features list, and CTA text",
      projectId: createdProjects[0].id,
      status: "in_progress" as const,
      priority: "high" as const,
      dueDate: new Date(now.getTime() + 2 * dayMs),
    },
    {
      title: "Set up analytics tracking",
      description: "Implement event tracking for sign-up flow and key user actions",
      projectId: createdProjects[0].id,
      status: "todo" as const,
      priority: "medium" as const,
      dueDate: new Date(now.getTime() + 4 * dayMs),
    },
    {
      title: "Send beta invites to waitlist",
      description: "Batch send 200 invites from the waitlist, prioritize by sign-up date",
      projectId: createdProjects[0].id,
      status: "todo" as const,
      priority: "urgent" as const,
      dueDate: new Date(now.getTime() + 1 * dayMs),
    },
    {
      title: "Define Q1 OKRs",
      description: "Draft objectives and key results for product and engineering",
      projectId: createdProjects[1].id,
      status: "done" as const,
      priority: "high" as const,
      dueDate: new Date(now.getTime() - 2 * dayMs),
    },
    {
      title: "Budget review meeting prep",
      description: "Prepare slides on projected costs, headcount, and tool spend",
      projectId: createdProjects[1].id,
      status: "in_progress" as const,
      priority: "medium" as const,
      dueDate: new Date(now.getTime() + 3 * dayMs),
    },
    {
      title: "Prioritize roadmap items",
      description: "Stack rank features based on impact and effort estimates",
      projectId: createdProjects[1].id,
      status: "todo" as const,
      priority: "high" as const,
      dueDate: new Date(now.getTime() + 5 * dayMs),
    },
    {
      title: "Review NPS survey results",
      description: "Analyze latest NPS scores and categorize open-ended responses",
      projectId: createdProjects[2].id,
      status: "todo" as const,
      priority: "medium" as const,
      dueDate: new Date(now.getTime() + 6 * dayMs),
    },
    {
      title: "Schedule user interviews",
      description: "Book 5 calls with churned users to understand pain points",
      projectId: createdProjects[2].id,
      status: "in_progress" as const,
      priority: "high" as const,
      dueDate: new Date(now.getTime() + 2 * dayMs),
    },
    {
      title: "Compile feature request summary",
      description: "Aggregate top 10 requested features from support tickets and interviews",
      projectId: createdProjects[2].id,
      status: "todo" as const,
      priority: "low" as const,
      dueDate: null,
    },
    {
      title: "Upgrade database to latest version",
      description: "Plan and execute the Postgres upgrade with zero downtime",
      projectId: createdProjects[3].id,
      status: "todo" as const,
      priority: "medium" as const,
      dueDate: new Date(now.getTime() + 7 * dayMs),
    },
    {
      title: "Set up monitoring alerts",
      description: "Configure alerts for error rate, latency, and CPU thresholds",
      projectId: createdProjects[3].id,
      status: "done" as const,
      priority: "high" as const,
      dueDate: new Date(now.getTime() - 1 * dayMs),
    },
    {
      title: "Follow up with design team on mockups",
      description: "Sarah mentioned the new dashboard mockups would be ready by Friday",
      projectId: null,
      status: "todo" as const,
      priority: "medium" as const,
      dueDate: new Date(now.getTime() + 3 * dayMs),
      aiGenerated: true,
      sourceText: "Meeting notes: Sarah said dashboard mockups will be done Friday. Need to follow up.",
    },
  ];

  const createdTasks = await db
    .insert(tasks)
    .values(
      taskData.map((t) => ({
        ...t,
        userId: user.id,
        aiGenerated: (t as Record<string, unknown>).aiGenerated as boolean || false,
        sourceText: (t as Record<string, unknown>).sourceText as string || null,
      }))
    )
    .returning();

  console.log(`Created ${createdTasks.length} tasks`);

  // Create sample meetings (stored transcripts)
  const meetingData = [
    {
      rawText: "Sprint standup — Sarah has the dashboard mockups almost done, targeting Friday. Mike is blocked on the API integration waiting for the new auth tokens. We need to send beta invites ASAP, at least 200 from the waitlist. Landing page copy is in review with marketing.",
      taskCount: 3,
      createdAt: new Date(now.getTime() - 2 * dayMs),
    },
    {
      rawText: "Q1 planning sync — OKRs are finalized. Top priorities: product launch by end of month, NPS improvement target of +10 points, infrastructure reliability target 99.9%. Budget review scheduled for Thursday, need slides ready. Roadmap prioritization happening next week.",
      taskCount: 4,
      createdAt: new Date(now.getTime() - 5 * dayMs),
    },
  ];

  await db
    .insert(meetings)
    .values(meetingData.map((m) => ({ ...m, userId: user.id })));

  console.log(`Created ${meetingData.length} sample meetings`);

  // Set starter work summary on the user
  await db.update(users).set({
    workSummary: `**Product Launch**
- Landing page copy in final review with marketing
- Beta invites queued for 200 waitlist users (urgent)
- Dashboard mockups expected from Sarah by Friday
- Analytics tracking setup pending

**Q1 Planning**
- OKRs finalized: launch by EOM, NPS +10, 99.9% uptime
- Budget review Thursday — slides in progress
- Roadmap prioritization scheduled for next week

**Customer Feedback**
- NPS survey results pending analysis
- 5 churned user interviews being scheduled
- Feature request aggregation needed

**Infrastructure**
- Monitoring alerts configured
- Database upgrade planned (zero downtime)

**Key People**: Sarah (design), Mike (engineering, blocked on auth tokens)`,
  }).where(eq(users.id, user.id));

  console.log("Set starter work summary");
  console.log("\nSeed complete! Login with:");
  console.log("  Email: demo@taskflow.app");
  console.log("  Password: demo1234");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
