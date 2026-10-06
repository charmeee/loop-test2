import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './loop/policy.mjs';
import { processBatch } from './loop/batch.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = path.join(root, '.loop-runtime');
const options = parseArgs(process.argv.slice(2));
const paused = () => existsSync(path.join(root,'LOOP_PAUSED')) || existsSync(path.join(root,'loop-pause-all'));
async function main() {
  if (!existsSync(path.join(root,'.loop-engineering/setup.json'))) throw new Error('먼저 npm run loop:setup을 실행하세요.');
  if (paused()) throw new Error('루프 일시 중지 상태입니다.');
  mkdirSync(runtime,{recursive:true});
  const lock = path.join(runtime,'batch-lock');
  try { mkdirSync(lock); } catch { throw new Error('다른 전체 이슈 실행이 진행 중입니다.'); }
  writeFileSync(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
  const startedAt = new Date().toISOString();
  try {
    // 페이지를 모두 조회합니다. REST issues 응답에 포함되는 PR은 제외합니다.
    const fetched = spawnSync('gh',['api','--paginate','--slurp','repos/charmeee/loop-test2/issues?state=open&labels=loop%3Aready&per_page=100'],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:20*1024*1024});
    if(fetched.error || fetched.status!==0) throw fetched.error ?? new Error(fetched.stderr);
    const issues = JSON.parse(fetched.stdout).flat().filter(i=>!i.pull_request && (!options.issue || i.number===options.issue));
    console.log(`loop:ready 이슈 ${issues.length}개를 번호순으로 처리합니다. 모드: ${options.mode}`);
    const results = await processBatch(issues, async issue => {
      if(paused()) return {status:'paused'};
      const file=path.join(runtime,`issue-${issue.number}.json`);
      const state=existsSync(file) ? JSON.parse(readFileSync(file,'utf8')) : null;
      if(options.mode==='report') {
        console.log(`#${issue.number}: ${issue.title} (${state?.phase ?? 'new'})`);
        return {status:state?.phase ?? 'new',reportOnly:true};
      }
      if(state?.phase==='needs-human') {
        console.log(`#${issue.number}: 보류 — ${state.lastError ?? state.attempts?.at(-1)?.error ?? '사람의 확인 필요'}`);
        return {status:'needs-human'};
      }
      console.log(`\n#${issue.number} 시작: ${issue.title}`);
      const child=spawnSync(process.execPath,[path.join(root,'scripts/run-issue-loop.mjs'),'--issue',String(issue.number)],{cwd:root,stdio:'inherit'});
      if(child.error || child.status!==0) throw child.error ?? new Error(`작업 종료 코드: ${child.status}`);
      const after=existsSync(file) ? JSON.parse(readFileSync(file,'utf8')) : null;
      return {status:after?.phase ?? 'no-op',prNumber:after?.prNumber ?? null};
    });
    const summary={startedAt,finishedAt:new Date().toISOString(),mode:options.mode,results};
    writeFileSync(path.join(runtime,'batch-summary.json'),JSON.stringify(summary,null,2)+'\n');
    console.log('\n전체 실행 요약:');
    for(const r of results) console.log(`#${r.number}: ${r.status}${r.prNumber ? ` (PR #${r.prNumber})` : ''}`);
    if(options.mode==='repair' && results.some(r=>['failed','needs-human','paused'].includes(r.status))) process.exitCode=1;
  } finally {rmSync(lock,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
