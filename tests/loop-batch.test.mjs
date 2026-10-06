import test from 'node:test';
import assert from 'node:assert/strict';
import { processBatch } from '../scripts/loop/batch.mjs';
test('all issues run once in numeric order and a failure does not stop the queue',async()=>{
  const seen=[];
  const results=await processBatch([{number:3},{number:1},{number:2}],async issue=>{
    seen.push(issue.number);
    if(issue.number===1) throw new Error('budget exceeded');
    return {status:'verified'};
  });
  assert.deepEqual(seen,[1,2,3]);
  assert.deepEqual(results.map(r=>r.status),['failed','verified','verified']);
});
test('blocked items remain in the summary and an empty queue does no work',async()=>{
  const results=await processBatch([{number:1},{number:2}],async i=>({status:i.number===1?'needs-human':'verified'}));
  assert.equal(results[0].status,'needs-human');
  assert.equal(results[1].status,'verified');
  assert.deepEqual(await processBatch([],()=>{throw new Error('must not call');}),[]);
});
