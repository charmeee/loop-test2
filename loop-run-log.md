# Loop Run Log — YOUR_PROJECT

Append one entry per run. Prune entries older than 30 days.

## Format

```json
{
  "run_id": "2026-06-09T08:15:00Z",
  "pattern": "daily-triage",
  "duration_s": 45,
  "items_found": 4,
  "actions_taken": 1,
  "escalations": 0,
  "tokens_estimate": 52000,
  "outcome": "report-only | fix-proposed | escalated | no-op"
}
```

## Recent Runs

<!-- Loop appends below this line -->
{"run_id":"2026-10-06T03:05:47.511Z","pattern":"pr-babysitter","duration_s":1.245,"outcome":"report-only","mode":"report"}

{"run_id":"2026-10-06T03:07:26.870Z","pattern":"pr-babysitter","duration_s":84.231,"outcome":"error","mode":"repair"}

{"run_id":"2026-10-06T03:09:09.704Z","pattern":"pr-babysitter","duration_s":3.453,"outcome":"error","mode":"repair"}

{"run_id":"2026-10-06T03:09:48.050Z","pattern":"pr-babysitter","duration_s":118.519,"outcome":"verified","mode":"repair"}

{"run_id":"2026-10-06T03:12:18.563Z","pattern":"pr-babysitter","duration_s":3.347,"outcome":"verified","mode":"repair","tokensUsed":null,"tokens_estimate":null}

{"run_id":"2026-10-06T03:12:54.424Z","pattern":"pr-babysitter","duration_s":1.248,"outcome":"report-only","mode":"report","tokensUsed":null,"tokens_estimate":null}
