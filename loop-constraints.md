# Binding constraints

- Scope: charmeee/loop-test2 only. Report first for validation; loop:start explicitly selects repair mode.
- Setup never calls an AI agent or writes GitHub issues/PRs.
- No PR merges, issue closure, automatic scheduling, or background agent start.
- If LOOP_PAUSED exists, stop before any action.
- Repairs use scripts/run-issue-loop.mjs with explicit repair mode.
- One issue per worktree/PR; check linked PRs to prevent duplicates.
- Maker may change issue-related src/** and tests/** only.
- Preserve existing test assertions; no CI/package/policy changes during implementation.
- Independent checker verifies requirements, diff, tests and lint before publication; coordinator verifies exact-SHA CI after PR publication.
- Maximum 3 attempts per issue; persist limits across runs; unknown usage remains unknown.
- Never mark human code review complete on behalf of a person.
- Never merge PRs or close issues, even after successful verification.

User-requested runtime policy: tokens are telemetry only, not a stop condition. Maximum 3 issue attempts, 20 tool actions per agent and 10 minutes per agent. Override upstream token-budget recommendations; retain history and repeated-failure checks.
