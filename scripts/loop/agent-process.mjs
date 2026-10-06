import { spawn } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';

export function actionCounter(limit) {
  const seen = new Set();
  return event => {
    const item=event.item;
    if (!['item.started','item.completed'].includes(event.type) || !item || !['command_execution','file_change','mcp_tool_call','web_search'].includes(item.type)) return false;
    // started/completed는 같은 작업입니다. 중복 집계하지 않습니다.
    const id=item.id ?? `${item.type}:${item.command ?? JSON.stringify(item.changes ?? [])}`;
    seen.add(id);
    return seen.size>limit;
  };
}
export function runAgentProcess(executable,args,{cwd,prompt,logPath,maxActions,timeoutMs}) {
  return new Promise((resolve,reject)=>{
    writeFileSync(logPath,'');
    const child=spawn(executable,args,{cwd,stdio:['pipe','pipe','pipe'],detached:process.platform!=='win32'});
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    const exceeds=actionCounter(maxActions);
    let pending='',stderr='',usage=null,stopReason=null,killTimer;
    function stop(reason) {
      if(stopReason) return;
      stopReason=reason;
      const kill=signal=>{try {if(process.platform==='win32') child.kill(signal);else process.kill(-child.pid,signal);}catch{}};
      kill('SIGTERM'); killTimer=setTimeout(()=>kill('SIGKILL'),2000);
    }
    const timeout=setTimeout(()=>stop(`에이전트 시간 제한: ${timeoutMs}ms`),timeoutMs);
    child.stdout.on('data',chunk=>{
      const value=chunk.toString();appendFileSync(logPath,value);pending+=value;
      let end;
      while((end=pending.indexOf('\n'))>=0) {
        const line=pending.slice(0,end);pending=pending.slice(end+1);
        try {
          const event=JSON.parse(line);
          if(event.type==='turn.completed') usage=event.usage;
          if(exceeds(event)) stop(`에이전트 도구 작업 제한 ${maxActions}회 초과`);
        } catch(error) {if(error instanceof SyntaxError) continue;stop(error.message);}
      }
    });
    child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-10000);});
    child.stdin.on('error',()=>{});
    child.on('error',error=>{clearTimeout(timeout);clearTimeout(killTimer);reject(error);});
    child.on('close',code=>{
      clearTimeout(timeout);clearTimeout(killTimer);
      if(stopReason || code!==0) reject(new Error(stopReason ?? `Codex 종료 코드 ${code}: ${stderr}`));
      else resolve(usage);
    });
    child.stdin.end(prompt);
  });
}
