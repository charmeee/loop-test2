import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {runAgentProcess} from '../scripts/loop/agent-process.mjs';

test('agent process records usage and terminates excessive work without calling a real AI',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'loop-process-test-'));
  const opts={cwd:dir,prompt:'',logPath:path.join(dir,'events.jsonl'),maxActions:2,timeoutMs:5000};
  try {
    const usage=await runAgentProcess(process.execPath,['-e',`console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:100,cached_input_tokens:80,output_tokens:5}}))`],opts);
    assert.equal(usage.cached_input_tokens,80);
    await assert.rejects(runAgentProcess(process.execPath,['-e',`for(let i=0;i<3;i++) console.log(JSON.stringify({type:'item.started',item:{id:String(i),type:'command_execution'}}));setInterval(()=>{},1000)`],opts),/도구 작업 제한/);
    await assert.rejects(runAgentProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{...opts,timeoutMs:100}),/시간 제한/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
