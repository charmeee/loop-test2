import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--target')) {
  console.error('Usage: node scripts/setup-loop.mjs [--target <test-directory>]');
  process.exit(1);
}
const target = args.length ? path.resolve(args[1]) : project;
const manifestPath = path.join(target, '.loop-engineering/setup.json');
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const missing = manifest.files.filter(file => !existsSync(path.join(target, file)));
  if (missing.length) throw new Error(`설정 파일 누락: ${missing.join(', ')}. 기존 설정을 점검하세요.`);
  console.log('이미 구성되어 있습니다. 기존 파일과 상태를 유지합니다.');
  process.exit(0);
}
const stage = mkdtempSync(path.join(tmpdir(), 'loop-engineering-setup-'));
const files = new Map();
function collect(source, destination) {
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) collect(from, to);
    else files.set(to, readFileSync(from));
  }
}
try {
  for (const pattern of ['issue-triage', 'pr-babysitter']) {
    const out = path.join(stage, pattern);
    const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['--yes', '@cobusgreyling/loop-init@1.7.0', out, '--pattern', pattern, '--tool', 'codex'],
      { stdio: 'inherit', timeout: 120000, cwd: project });
    if (result.error || result.status !== 0) throw result.error ?? new Error(`loop-init failed: ${pattern}`);
    // 공식 원본은 패턴별로 분리해 보존합니다.
    collect(out, `.loop-engineering/patterns/${pattern}`);
    // 공통 skills는 PR 관리 패턴 버전을 사용하고 기존 파일은 덮어쓰지 않습니다.
    for (const location of ['.grok/skills', '.claude/skills', '.codex/skills']) {
      const dir = path.join(out, location);
      if (existsSync(dir)) collect(dir, '.agents/skills');
    }
    const state = pattern === 'issue-triage' ? 'issue-triage-state.md' : 'pr-babysitter-state.md';
    if (!existsSync(path.join(out, state))) throw new Error(`공식 state 파일 없음: ${state}`);
    files.set(state, readFileSync(path.join(out, state)));
  }
  const pr = path.join(stage, 'pr-babysitter');
  for (const name of ['loop-ledger.json', 'loop-budget.md', 'loop-run-log.md']) {
    if (!existsSync(path.join(pr, name))) throw new Error(`공식 설정 파일 없음: ${name}`);
    files.set(name, readFileSync(path.join(pr, name), 'utf8').replace('YOUR_PROJECT', 'charmeee/loop-test2'));
  }
  files.set('LOOP.md', `# Issue → implementation → PR management\n\nRepository: charmeee/loop-test2\nMode: report first; merge and issue closure forbidden.\n\n1. Read loop-constraints.md, loop-budget.md and persistent state first.\n2. Run issue-triage and loop-intake against loop:ready issues.\n3. Report ambiguous requirements; never guess a done definition.\n4. Implementation uses scripts/run-issue-loop.mjs and separate Codex maker/checker sessions.\n5. Before a repair attempt run loop-guard; use an issue-specific ledger copied from the seeded ledger.\n6. Separate maker and checker; isolate worktrees; implement only one issue per PR.\n7. Read existing linked PRs before creating one. Use PR Babysitter for CI/review follow-up.\n8. Do not merge PRs or close issues. Human review and merge remain required.\n9. Record evidence, candidate SHA, actual measured usage and result.\n\nOfficial pattern originals:\n- .loop-engineering/patterns/issue-triage/LOOP.md\n- .loop-engineering/patterns/pr-babysitter/LOOP.md\n\nImplementation contract: docs/runner-implementation.md\n`);
  files.set('loop-constraints.md', `# Binding constraints\n\n- Scope: charmeee/loop-test2 only. Report first for validation; loop:start explicitly selects repair mode.\n- Setup never calls an AI agent or writes GitHub issues/PRs.\n- No PR merges, issue closure, automatic scheduling, or background agent start.\n- If LOOP_PAUSED exists, stop before any action.\n- Repairs use scripts/run-issue-loop.mjs with explicit repair mode.\n- One issue per worktree/PR; check linked PRs to prevent duplicates.\n- Maker may change issue-related src/** and tests/** only.\n- Preserve existing test assertions; no CI/package/policy changes during implementation.\n- Independent checker verifies requirements, diff, tests and lint before publication; coordinator verifies exact-SHA CI after PR publication.\n- Maximum 3 attempts per issue; persist limits across runs; unknown usage remains unknown.\n- Never mark human code review complete on behalf of a person.\n- Never merge PRs or close issues, even after successful verification.\n`);
  files.set('AGENTS.md', `# Loop Engineering\n\nRead LOOP.md and loop-constraints.md before any loop work.\nSkills are in .agents/skills; official pattern originals are in .loop-engineering/patterns.\nThis configuration does not launch an agent. Start in report mode.\nDo not merge PRs or close issues.\n`);
  // 생성 계획 전체를 확인한 뒤에만 파일을 씁니다.
  const conflicts = [...files.keys()].filter(file => existsSync(path.join(target, file)));
  if (conflicts.length) throw new Error(`기존 설정을 덮어쓰지 않습니다: ${conflicts.join(', ')}`);
  for (const [file, content] of files) {
    const absolute = path.join(target, file);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, content, { flag: 'wx' });
  }
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify({ version: 1, initVersion: '1.7.0', files: [...files.keys()], createdAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' });
  console.log(`\n구성 완료: ${target}\n공식 skills·state·ledger 생성. AI 실행·PR 생성·머지·이슈 종료는 하지 않았습니다.`);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
