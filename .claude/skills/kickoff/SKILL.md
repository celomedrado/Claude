---
name: kickoff
description: Start a new feature workflow: create Feature Thread file, call PM/ARCH/FE/BE/QA for artifacts, and have DM compile DoR status.
argument-hint: "<feature name> | <goal> | priority=<P0/P1/P2> | target=<YYYY-MM-DD> | links=<...>"
disable-model-invocation: true
---

Before doing anything:
1) Read `.claude/workflow-mode.json` (default to "solo" if missing).
2) Branch behavior by mode:

MODE = solo:
- Follow the exact workflow from `.claude/CLAUDE.md`:
  - Ask clarifying questions until confident.
  - Produce a Cursor discovery prompt (with file paths, functions, DB objects).
  - Propose phases (usually 1–3) and create Cursor prompts for each phase.
- Write outputs into the Feature Thread under section: "## Solo (CTO) Plan"

MODE = agents:
- Ensure Agent Teams are enabled (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1). If not enabled, explain how to enable in `.claude/settings.json`.
- If enabled, spawn teammates (PM/ARCH/FE/BE/QA) and require plan approval before changes.
- Create/update the Feature Thread and collect artifacts (brief, ADR decision, contract, test plan, release plan) per `.claude/team-protocol.md`.
- DM synthesizes a Cursor discovery prompt + phased execution prompts informed by those artifacts.
- Write outputs under: "## Agents Plan"

MODE = both:
- Run agents mode first (Agents Plan).
- Then run solo mode (Solo Plan).
- Add "## Comparison" with:
  - Key differences in scope/risks/architecture/testing
  - Recommendation + why

---

You are running the team kickoff workflow.

1) Create or update `.claude/feature-threads/<feature-slug>.md`.
   - Use a kebab-case slug derived from the feature name.
   - Insert the Feature Thread header template from `.claude/team-protocol.md`.

2) Call the agents to populate artifacts in the Feature Thread:
   - Use the product-manager agent to write the Feature Brief section.
   - Use the architect agent to write architecture direction and ADR/RFC decision.
   - Use the frontend-engineer and backend-engineer agents to draft the API Contract and implementation plan.
   - Use the qa-engineer agent to draft the Test Plan.
   - Use the dev-manager agent to add milestones, risks, and the Release Plan stub.

3) After all outputs are in the Feature Thread:
   - DM updates DoR checklist status and lists the exact /signoff commands to run.

Rules:
- Follow `.claude/team-protocol.md` exactly.
- Every invoked agent must respond with Ack/Output/Next/Commands.
