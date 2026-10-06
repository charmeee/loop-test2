import test from 'node:test';
import assert from 'node:assert/strict';
import {parseArgs, assertPaths, ciStatus, relatedIssue} from '../scripts/loop/policy.mjs';
test('no CI and unfinished checks cannot approve',()=>{
  assert.equal(ciStatus([]),'unknown');
  assert.equal(ciStatus([{name:'CLA',status:'COMPLETED',conclusion:'SUCCESS'}]),'unknown');
  assert.equal(ciStatus([{name:'verify',status:'IN_PROGRESS',conclusion:''}]),'pending');
  assert.equal(ciStatus([{name:'verify',status:'COMPLETED',conclusion:'FAILURE'}]),'failure');
  assert.equal(ciStatus([{name:'verify',status:'COMPLETED',conclusion:'SUCCESS'}]),'success');
});
test('policy rejects CI/package modifications and large diffs',()=>{
  for(const paths of [['.github/workflows/test.yml'],['package.json'],Array.from({length:6},(_,i)=>`src/${i}.mjs`),[]]) assert.throws(()=>assertPaths(paths));
  assert.doesNotThrow(()=>assertPaths(['src/discount.mjs','tests/discount.test.mjs']));
});
test('issue matching never treats issue 10 as issue 1',()=>{
  assert.equal(relatedIssue({body:'Closes #10',headRefName:'other'},{number:1}),false);
  assert.equal(relatedIssue({body:'Closes #1',headRefName:'other'},{number:1}),true);
});
test('unknown mode and malformed selectors are rejected',()=>{
  assert.throws(()=>parseArgs(['--mode','merge']));
  assert.throws(()=>parseArgs(['--issue','1;rm']));
  assert.deepEqual(parseArgs(['--mode','report','--issue','2']),{mode:'report',issue:2});
});
