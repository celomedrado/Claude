# .claude/team-protocol.md

## Purpose
Single source of truth for how our AI agent team collaborates to deliver scalable, high-quality features.

## Agent IDs (used in commands)
- DM = dev-manager
- PM = product-manager
- ARCH = architect
- FE = frontend-engineer
- BE = backend-engineer
- QA = qa-engineer

## Canonical collaboration artifact
Each feature has one canonical **Feature Thread** markdown file:
`.claude/feature-threads/<feature-slug>.md`

## Claude Code note on "slash commands"
Claude Code already has built-in commands like `/review`, so team commands avoid collisions.

We implement team commands as Skills:
- /kickoff
- /call-agent
- /handoff
- /team-review
- /signoff
- /decision
- /sync
- /blocker
- /risk

## Response format (mandatory for all agents)
When an agent is invoked (directly or via /call-agent), respond with:
- **Ack:** what you understood
- **Output:** your deliverable
- **Next:** what's needed next (if any)
- **Commands:** any follow-up team commands to run

---

## Feature lifecycle (gated)

### Required artifacts (must exist in Feature Thread)
1) Feature Brief (PM)
2) Architecture direction + ADR/RFC decision (ARCH)
3) API Contract (FE+BE; ARCH if major)
4) Implementation plan (FE/BE)
5) Test plan (QA)
6) Release plan (DM)

### Definition of Ready (DoR)
Engineering starts only when:
- PM posted Feature Brief with acceptance criteria, edge cases, NFRs, success metrics
- ARCH posted design direction OR "no ADR needed"
- FE/BE posted API contract (or explicit plan to finalize it first)
- QA posted test plan + env/data needs
- DM confirmed milestones/risks

### Definition of Done (DoD)
A feature is done only when:
- FE/BE merged with review
- tests updated + passing
- QA validation done (or waiver documented by DM+PM+QA)
- observability added where relevant
- ARCH sign-off for major scale/reliability/security changes
- release plan executed (flags/rollout/rollback)

---

## Templates (copy into Feature Thread)

### Feature Thread header (DM)
- Feature:
- Goal:
- Priority/Target:
- Links:
- Owners: PM/ARCH/FE/BE/QA/DM
- Status:
- Risks:
- Decisions needed:

### Feature Brief (PM)
- Summary
- Problem / Opportunity
- Goals / Non-goals
- User stories
- Acceptance criteria (Given/When/Then)
- Edge cases
- NFRs (perf/reliability/security/privacy/accessibility/observability)
- Dependencies
- Analytics / success metrics
- Rollout plan
- Open questions

### ADR/RFC (ARCH) when triggered
- Context
- Decision
- Options considered (pros/cons)
- Consequences
- Rollout/migration/rollback
- Observability signals

### API Contract (FE+BE)
- Endpoints
- AuthN/AuthZ
- Request/Response schemas
- Error shape
- Pagination/sorting/filtering
- Idempotency (writes)
- Versioning/back-compat
- Minimal examples

### Test Plan (QA)
- Scope
- P0/P1/P2 scenarios
- Unit/Integration/E2E coverage
- Data/env needs
- Automation plan
- Risks/mitigations

### Release Plan (DM)
- Flag + rollout steps
- Monitoring signals
- Rollback triggers + steps
- Comms/notes
