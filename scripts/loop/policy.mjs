export function parseArgs(args) {
  const result = { mode: 'repair', issue: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' && ['report', 'repair'].includes(args[i + 1])) result.mode = args[++i];
    else if (args[i] === '--issue' && /^\d+$/.test(args[i + 1] ?? '')) result.issue = Number(args[++i]);
    else throw new Error('Usage: npm run loop:start -- [--mode report|repair] [--issue N]');
  }
  return result;
}
export function assertPaths(paths) {
  if (!paths.length || paths.length > 5 || paths.some(p => !/^(src|tests)\/[^/]+\.mjs$/.test(p))) throw new Error(`허용 범위 위반: ${paths.join(', ')}`);
}
export function ciStatus(checks) {
  if (!checks.length) return 'unknown';
  if (checks.some(c => (c.status && c.status !== 'COMPLETED') || c.state === 'PENDING')) return 'pending';
  return checks.every(c => c.conclusion === 'SUCCESS' || c.state === 'SUCCESS') ? 'success' : 'failure';
}
export function relatedIssue(pr, issue) {
  return pr.headRefName === `issue/${issue.number}-implementation` || new RegExp(`(?:Closes|Fixes|Resolves)\\s+#${issue.number}(?!\\d)`, 'i').test(pr.body ?? '');
}
export function checkboxItems(body) {
  return body.split('\n').filter(l => /^\s*- \[[ xX]\]/.test(l));
}
