---
name: kickoff
description: Start a new feature workflow: create Feature Thread file, call PM/ARCH/FE/BE/QA for artifacts, and have DM compile DoR status.
argument-hint: "<feature name> | <goal> | priority=<P0/P1/P2> | target=<YYYY-MM-DD> | links=<...>"
disable-model-invocation: true
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
