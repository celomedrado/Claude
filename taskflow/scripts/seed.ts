import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { users, projects, tasks } from "../src/db/schema";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(path.join(dataDir, "taskflow.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create tables if they don't exist
const migrationPath = path.join(process.cwd(), "drizzle", "0000_outstanding_vin_gonzales.sql");
if (fs.existsSync(migrationPath)) {
  const migration = fs.readFileSync(migrationPath, "utf-8");
  const statements = migration.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      sqlite.exec(stmt);
    } catch {
      // Table already exists, skip
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
