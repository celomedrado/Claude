---
name: start-team
description: Spawn the standard product-dev Agent Team (PM, ARCH, FE, BE, QA) and have them load team-protocol + role instructions. The lead session acts as DM.
argument-hint: "<team-name> | mode=<auto|in-process|tmux> | model=<Sonnet|Haiku>"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---
You are the team lead. Start (or reuse) an Agent Team for this repository.

## Step 0 — Parse arguments
Interpret $ARGUMENTS as:
- team-name (default: `product-dev-team`)
- optional mode=auto|in-process|tmux (default: auto)
- optional model=Sonnet|Haiku (default: Sonnet)

## Step 1 — Verify Agent Teams are enabled
Agent Teams require `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.
- First, read `.claude/settings.json`.
- If that flag is not present there, tell the user exactly how to enable it (include the JSON snippet) and stop.

## Step 2 — Apply teammate display mode (optional)
If mode=... was provided, remind the user they can set:
- `"teammateMode": "in-process"` (or "tmux"/"auto") in `.claude/settings.json`,
or pass `claude --teammate-mode in-process` for this session.
Do not block on this; continue.

## Step 3 — Create the team
Ask Claude Code to create an agent team with five teammates, each with a clear role:
- PM teammate: Product Manager (feature briefs, acceptance criteria, success metrics)
- ARCH teammate: Architect (ADR/RFC decisions, scalability/reliability/security)
- FE teammate: Frontend Engineer (UI, accessibility/performance, FE tests, E2E hooks)
- BE teammate: Backend Engineer (APIs/data, reliability/observability, BE tests)
- QA teammate: QA Engineer (test plan, automation strategy, validation, signoff)

Use the requested model for each teammate (default Sonnet).

Important constraints:
- Teammates do NOT inherit the lead's conversation history. Include all critical context in the spawn prompt.
- Require plan approval before any teammate makes code changes.

## Step 4 — Teammate onboarding instructions (in the spawn prompt)
In the spawn prompt, tell each teammate to:
1) Read `.claude/team-protocol.md`
2) Read their role file in `.claude/agents/`:
   - PM -> product-manager.md
   - ARCH -> architect.md
   - FE -> frontend-engineer.md
   - BE -> backend-engineer.md
   - QA -> qa-engineer.md
3) Post a short "Ready" message using:
   - Ack / Output / Next / Commands
4) Coordinate via the team protocol and the shared Feature Thread files in `.claude/feature-threads/`.

## Step 5 — Create initial shared tasks
Create tasks in the shared task list:
- PM: confirm Feature Brief template adherence and propose the first brief skeleton
- ARCH: summarize ADR triggers + propose design review checklist
- FE/BE: propose a standard API Contract skeleton + error shape
- QA: propose a standard Test Plan skeleton (P0/P1/P2)
- Lead (DM): ensure DoR/DoD gates and "kickoff" flow are clear

## Step 6 — Show the user how to interact
After the team spawns, tell the user:
- Use Shift+Down to cycle through teammates (in-process mode)
- Press Ctrl+T to toggle the shared task list
- Teammates can message each other directly, and the lead can assign tasks.

## Finish
End by suggesting the next command:
- `/kickoff <feature name> | <goal> | priority=<P0/P1/P2> | target=<YYYY-MM-DD> | links=<...>`
