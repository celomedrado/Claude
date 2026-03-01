---
name: call-agent
description: Delegate a request to a specific team subagent (DM/PM/ARCH/FE/BE/QA) and return their structured response.
argument-hint: "<DM|PM|ARCH|FE|BE|QA> <request...>"
disable-model-invocation: true
---

Parse $ARGUMENTS:
- First token is the target: DM, PM, ARCH, FE, BE, or QA.
- Remaining text is the request.

Map targets to agent names:
- DM -> dev-manager
- PM -> product-manager
- ARCH -> architect
- FE -> frontend-engineer
- BE -> backend-engineer
- QA -> qa-engineer

Then delegate to that agent and return their response verbatim.
Require the agent to respond with: Ack / Output / Next / Commands.
