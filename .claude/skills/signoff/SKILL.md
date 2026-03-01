---
name: signoff
description: Request a formal signoff from a specific agent for DoR/DoD/ADR/Contract/TestPlan/Release.
argument-hint: "<DM|PM|ARCH|FE|BE|QA> <DoR|DoD|ADR|Contract|TestPlan|Release> <where>"
disable-model-invocation: true
---

Use /call-agent. The agent must either:
- Sign off explicitly and state what they checked, OR
- Refuse signoff with specific blockers and next steps.
