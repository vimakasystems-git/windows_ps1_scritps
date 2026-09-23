import test from 'node:test';import assert from 'node:assert/strict';
import {makeSteps,executeSteps} from '../workflow.mjs';
import {rankScore} from '../public/benchmark-ranking.js';
test('benchmark independente apenas mede e gera relatorio',()=>{
 assert.deepEqual(makeSteps('benchmark').map(x=>x.id),['benchmark','report']);
});
test('fluxo automatico nao abre configuracoes nem desfaz energia no final',()=>{
 const ids=makeSteps('performance').map(s=>s.id);
 for(const manual of ['storage','startup','updates','audio','printers','reliability','restoreEnergy'])assert.ok(!ids.includes(manual));
 assert.equal(ids[0],'before');assert.ok(ids.indexOf('after')>ids.indexOf('energy'));assert.throws(()=>makeSteps('__proto__'));
});
test('falha e etapa ignorada nunca recebem check de sucesso; fila continua',async()=>{
 const job={steps:[{id:'fail'},{id:'skip'},{id:'ok'}]};const progress=[];
 await executeSteps(job,async s=>{if(s.id==='fail')throw Error('sem admin');if(s.id==='skip')return {skip:true,detail:'reinicio'};},async()=>{if(job.progress)progress.push(job.progress);});
 assert.deepEqual(job.steps.map(s=>s.status),['failed','skipped','success']);assert.equal(job.progress,100);assert.equal(job.hasWarnings,true);assert.ok(progress.every((v,i)=>!i||v>=progress[i-1]));
});
test('ranking compara somente valor informado com referencias e trata empate',()=>{
 assert.throws(()=>rankScore(NaN,[]));assert.throws(()=>rankScore(0,[]));
 const result=rankScore(3000,[{name:'A',score:3100},{name:'B',score:3000}]);assert.equal(result.find(x=>x.local).rank,2);assert.equal(result.find(x=>x.name==='B').rank,2);
});
