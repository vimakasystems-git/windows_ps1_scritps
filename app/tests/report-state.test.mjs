import test from 'node:test';
import assert from 'node:assert/strict';
import {recordReport} from '../report-state.mjs';
test('diagnosis and later benchmark do not erase the performance before-after pair',()=>{
 const c={};recordReport(c,{id:'p',mode:'performance',before:{freeGB:2},after:{freeGB:3},benchmarkBefore:{cpuSha256MiBs:100},benchmarkAfter:{cpuSha256MiBs:90},steps:[{id:'repair',status:'skipped'}]});
 const pair=structuredClone(c.performanceReport);
 recordReport(c,{id:'d',mode:'diagnostic',benchmarkAfter:{cpuSha256MiBs:80}});
 recordReport(c,{id:'b',mode:'benchmark',benchmarkAfter:{cpuSha256MiBs:70}});
 assert.deepEqual(c.performanceReport,pair);assert.equal(c.diagnosticReport.jobId,'d');assert.equal(c.lastReport.jobId,'b');
});
test('incomplete performance never borrows readings from a different run',()=>{
 const c={};recordReport(c,{id:'first',mode:'performance',benchmarkBefore:{cpuSha256MiBs:100},benchmarkAfter:{cpuSha256MiBs:90}});
 recordReport(c,{id:'failed',mode:'performance',steps:[{id:'benchmarkBefore',status:'failed'}]});
 assert.equal(c.performanceReport.benchmarkBefore,null);assert.equal(c.performanceReport.benchmarkAfter,null);
});
