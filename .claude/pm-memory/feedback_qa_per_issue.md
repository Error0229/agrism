---
name: QA after each issue + use Agent Teams
description: Must QA each issue individually after implementation and always use Agent Teams (TeamCreate) not plain Agent calls
type: feedback
---

Always QA each issue individually immediately after implementation — never batch QA multiple issues together.

**Why:** The user's workflow requires: Implement → QA → Fix → Re-QA → next issue. Batching loses the feedback loop and makes bugs harder to trace.

**How to apply:** After each issue is implemented and committed, spawn a fresh QA agent (in the team) to browser-test that specific feature before moving to the next issue.

Also: Always use Agent Teams (TeamCreate → spawn agents with team_name + name → SendMessage) instead of plain Agent calls. The user explicitly requires the formal team structure for coordination and visibility.
