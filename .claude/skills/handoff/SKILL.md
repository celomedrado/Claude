---
name: handoff
description: Assign a task to a specific agent using the team protocol and expected deliverables.
argument-hint: "<DM|PM|ARCH|FE|BE|QA> <task + expected outputs>"
disable-model-invocation: true
---

Use /call-agent to delegate the task.
The delegated agent must include acceptance/outputs and respond Ack/Output/Next/Commands.
