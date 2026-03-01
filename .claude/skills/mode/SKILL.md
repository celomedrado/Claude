---
name: mode
description: Set or show the workflow mode (solo | agents | both).
argument-hint: "<solo|agents|both|status>"
disable-model-invocation: true
allowed-tools: Read, Write, Edit
---
If $ARGUMENTS is "status" or empty:
- Read `.claude/workflow-mode.json` and print the current mode.

If $ARGUMENTS is one of: solo, agents, both:
- Write `{ "mode": "<value>" }` to `.claude/workflow-mode.json`
- Confirm the new mode and show the next suggested command:
  - solo -> suggest normal chat flow or `/kickoff ...`
  - agents -> suggest `/start-team ...` then `/kickoff ...`
  - both -> suggest `/kickoff ...` and explain it will produce 2 plans + comparison
