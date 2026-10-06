# Issue → implementation → PR management

Repository: charmeee/loop-test2
Mode: report first; merge and issue closure forbidden.

1. Read loop-constraints.md, loop-budget.md and persistent state first.
2. Run issue-triage and loop-intake against loop:ready issues.
3. Report ambiguous requirements; never guess a done definition.
4. Implementation uses scripts/run-issue-loop.mjs and separate Codex maker/checker sessions.
5. Before a repair attempt run loop-guard; use an issue-specific ledger copied from the seeded ledger.
6. Separate maker and checker; isolate worktrees; implement only one issue per PR.
7. Read existing linked PRs before creating one. Use PR Babysitter for CI/review follow-up.
8. Do not merge PRs or close issues. Human review and merge remain required.
9. Record evidence, candidate SHA, actual measured usage and result.

Official pattern originals:
- .loop-engineering/patterns/issue-triage/LOOP.md
- .loop-engineering/patterns/pr-babysitter/LOOP.md

Implementation contract: docs/runner-implementation.md

User-requested runtime policy: tokens are telemetry only, not a stop condition. Maximum 3 issue attempts, 20 tool actions per agent and 10 minutes per agent. Override upstream token-budget recommendations; retain history and repeated-failure checks.
