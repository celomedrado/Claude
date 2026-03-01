# agents.md

## Purpose
A quick registry of our AI agents, how to address them, and common collaboration "recipes."

**Source of truth:** `team-protocol.md` (templates, gates, and slash command rules).
This file is a **directory + quickstart** only.

---

## Agent Directory

| ID | Agent | Primary ownership | Typical outputs |
|---|---|---|---|
| **DM** | Dev Manager | Delivery coordination, gates (DoR/DoD), release orchestration | Feature Thread header, milestones, release plan, go/no-go |
| **PM** | Product Manager | Problem definition, scope, acceptance criteria, success metrics | Feature Brief, scope decisions, success metrics plan |
| **ARCH** | Architect | Scalability/reliability/security design, ADR/RFCs, readiness review | Design direction, ADR/RFC, prod readiness notes |
| **FE** | Frontend Engineer | UI/UX implementation, accessibility/performance, FE tests | UI plan, components/pages, FE tests, selectors/hooks |
| **BE** | Backend Engineer | APIs/services/data, reliability/observability, BE tests | API contract, services/migrations, BE tests, metrics/logs |
| **QA** | QA Engineer | Test strategy, risk-based coverage, automation, release confidence | Test plan, bug reports, QA sign-off + residual risk |

---

## Slash Command Cheat Sheet

**Format:** `/<command> <TARGET> <message>`

### Ask / Request
- `/call <TARGET> <question or request>`
- `/handoff <TARGET> <task + expected deliverables>`

### Review / Approvals
- `/review <TARGET> <what to review + link/summary>`
- `/signoff <TARGET> <DoR|DoD|ADR|Contract|TestPlan|Release> <link/summary>`

### Coordination
- `/sync <TARGET> <topic + alignment needed>`

### Decisions / Escalations
- `/decision <TARGET> <decision needed + options + deadline>`
- `/blocker DM <what is blocked + what you need>`
- `/risk DM <risk + impact + mitigation proposal>`

**Response rule (everyone):**
When you receive a slash command targeted to you, reply with:
- **Ack:** …
- **Output:** …
- **Next:** …
- **Commands:** …

---

## Common Collaboration Recipes (Copy/Paste)

### 1) Start a New Feature (Kickoff)

**DM** creates Feature Thread header, then triggers kickoff requests:

- `/call PM Please post Feature Brief (template in team-protocol.md) for <feature>. Include acceptance criteria, edge cases, NFRs, success metrics.`
- `/call ARCH Provide design direction for <feature>. Is an ADR/RFC needed? Note scalability/reliability/security risks.`
- `/call FE Post UI plan (states/flows/edge cases) and contract needs for <feature>.`
- `/call BE Post backend plan (endpoints/data/migrations) and contract needs for <feature>.`
- `/call QA Post initial test plan (P0/P1/P2, env/data needs, automation approach) for <feature>.`

**DoR signoffs**
- `/signoff PM DoR <link to brief>`
- `/signoff QA DoR <link to test plan>`
- `/signoff DM DoR <link to thread>`
- `/signoff ARCH DoR <link>` (if architecture involvement)

---

### 2) Lock the API Contract (FE + BE)

**FE → BE**
- `/sync BE Let's lock API Contract for <feature>: endpoints + error shape + pagination + examples. I'll draft FE expectations here: <link>.`

**BE → FE**
- `/review FE Please review API Contract draft for <feature> and confirm UI edge cases + error handling: <link>.`

**QA gets informed**
- `/call QA API Contract is ready for <feature>. Please validate testability + scenarios and request any hooks/data needs: <link>.`

**Contract signoff (optional but recommended)**
- `/signoff QA Contract <link>`
- `/signoff ARCH Contract <link>` (if significant/perf/security implications)

---

### 3) Trigger an ADR/RFC (Architecture decision needed)

**Anyone → ARCH**
- `/decision ARCH ADR needed for <topic>. Options: (A)… (B)… Constraints: … Deadline: <date>.`

**ARCH → DM (risk tracking)**
- `/risk DM Architectural decision pending for <feature>: impact <…>. Proposed mitigation: <…>.`

**ARCH outputs ADR + requests review**
- `/review BE Please review ADR <id> focusing on data/reliability implications: <link>.`
- `/review FE Please review ADR <id> focusing on client impact/perf: <link>.`
- `/review QA Please review ADR <id> focusing on failure modes/testability: <link>.`
- `/signoff ARCH ADR <link>`

---

### 4) QA Shift-Left (ensure test plan is early)

**QA → PM (clarify acceptance criteria)**
- `/call PM I need clarification on these edge cases for <feature>: (1)… (2)… Also confirm success metrics events.`

**QA → FE/BE (test hooks)**
- `/call FE Please add stable selectors for E2E on: <list>.`
- `/call BE Please provide deterministic test data strategy (seed or fixtures) for: <scenarios>.`

---

### 5) Handling a Blocker (env/data/dependency)

**Anyone → DM**
- `/blocker DM Blocked on <issue>. Need <env/data/access/decision> from <owner>. Impact: <timeline/risk>.`

**DM coordinates**
- `/handoff <TARGET> Please resolve blocker: <issue>. Deliverable: <what done looks like>.`

---

### 6) Scope Change Mid-Flight

**Anyone → PM (decision owner)**
- `/decision PM Scope question for <feature>: Option A (…)/Option B (…). Impact on timeline: … Impact on quality: … Deadline: <date>.`

**PM informs QA + DM**
- `/call QA Scope changed: <summary>. Please update test plan coverage accordingly: <link>.`
- `/sync DM Scope changed: <summary>. Please update milestones/release plan: <link>.`

---

### 7) Pre-Release Readiness (DM-led)

**DM requests final checks**
- `/review QA Please execute/confirm release validation per test plan for <feature>. Provide go/no-go + residual risks: <link>.`
- `/review ARCH Please confirm prod readiness for <feature> (scaling/failure modes/monitoring/rollback): <link>.`
- `/review FE Please confirm UI perf/accessibility checks + telemetry events in place: <link>.`
- `/review BE Please confirm observability/metrics/logs + migration safety: <link>.`

**DoD / Release signoffs**
- `/signoff QA DoD <link>`
- `/signoff ARCH DoD <link>` (major changes)
- `/signoff DM DoD <link>`
- `/signoff PM Release <link>` (when needed)
- `/signoff DM Release <link>`

---

## Example "Mini Transcript" (How it should look)

**DM:** `/call PM Post Feature Brief for "Saved Searches" (template).`
**PM:**
- **Ack:** Feature Brief requested for Saved Searches.
- **Output:** Posted brief + acceptance criteria + success metrics here: <link>.
- **Next:** Need ARCH input on scale assumptions.
- **Commands:** `/call ARCH Please provide design direction + ADR decision for Saved Searches. <link>.`

**ARCH:**
- **Ack:** Reviewing Saved Searches for design direction.
- **Output:** Recommend approach X; risks Y; ADR required due to data model change. Drafting ADR: <link>.
- **Next:** Need BE to confirm migration feasibility.
- **Commands:** `/review BE Please review migration approach in ADR draft. <link>.`

**QA:**
- **Ack:** Test plan requested.
- **Output:** Test Plan posted with P0/P1/P2 + automation plan: <link>.
- **Next:** Need FE selectors for E2E on results list + filters.
- **Commands:** `/call FE Please add stable selectors for list rows, filter chips, and save button. <link>.`

---

## Quick "Who to ping?" Guide

- Requirements unclear → `/call PM …`
- Scaling/reliability/security concern → `/call ARCH …` or `/decision ARCH …`
- API mismatch or error-shape ambiguity → `/sync FE …` + `/sync BE …`
- Test data/env missing → `/blocker DM …` + `/call BE …`
- Release readiness/go-no-go → `/review QA …` then `/signoff QA DoD …`
- Timeline risk/dependencies → `/risk DM …` or `/blocker DM …`
