import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {diagnose,symptomRoute} from '../diagnosis.mjs';
import {validateProposal} from '../repair-catalog.mjs';
import {RepairEngine,atomicJSON} from '../repair-engine.mjs';
import {features,featureAllowed} from '../public/plans.js';
import {manufacturers,officialDriverURL} from '../drivers.mjs';
const available=data=>({status:'available',data});
function evidence(overrides={}){return {at:new Date().toISOString(),windowHours:72,boot:available([]),events:available([]),services:available([]),startup:available([{name:'UserApp',protected:false},{name:'SecurityHealth',protected:true}]),network:available({adapters:[{status:'Up'}]}),performance:available({samples:[]}),...overrides};}
async function engine(execute){return new RepairEngine({folder:await fs.mkdtemp(path.join(os.tmpdir(),'care-journal-')),execute}).init();}
test('missing data and isolated events do not turn into critical faults',()=>{
 const d=diagnose(evidence({boot:{status:'unavailable'},events:available([{provider:'Application Error',id:1000,at:new Date().toISOString()}])}));
 assert.equal(d.findings.find(f=>f.id==='unavailable-boot').kind,'unavailable');assert.equal(d.findings.find(f=>f.id==='app-crashes').kind,'information');assert.ok(d.findings.every(f=>f.severity!=='high'));assert.equal(d.timeline.length,0);
});
test('VPN, proxy and blocked ICMP remain context or hypotheses, not proven root causes',()=>{
 const d=diagnose(evidence({network:available({adapters:[{status:'Up'}],vpnDetected:true,proxyEnabled:true,probe:{dnsStatus:'resolved',gateway:{sent:4,received:0},target:{sent:4,received:0}}})}));
 assert.equal(d.findings.find(f=>f.id==='network-policy').kind,'information');assert.equal(d.findings.find(f=>f.id==='network-loss').kind,'hypothesis');assert.ok(!d.findings.some(f=>f.id==='network-dns'));assert.match(d.findings.find(f=>f.id==='network-gateway').hypothesis,/ICMP/);
});
test('integrity repair requires real Repairable evidence, not events or pending restart',()=>{
 for(const raw of [evidence(),evidence({integrity:{state:'Healthy'}}),evidence({integrity:{state:'NonRepairable'}}),evidence({restartPending:true,integrity:{state:'Repairable'}})])assert.throws(()=>validateProposal('integrityRepair',{},diagnose(raw)));
 assert.doesNotThrow(()=>validateProposal('integrityRepair',{},diagnose(evidence({integrity:{state:'Repairable',at:new Date().toISOString()}}))));
});
test('older Windows remains diagnostic-only while supported x64 keeps eligible actions',()=>{
 const old=diagnose(evidence({os:{build:22000,productType:1,nativeArchitecture:'AMD64'}}));assert.ok(old.findings.some(f=>f.id==='compatibility'));assert.ok(old.findings.every(f=>!f.actions.includes('startupDisable')&&!f.actions.includes('integrityScan')));
 const supported=diagnose(evidence({os:{build:26100,productType:1,nativeArchitecture:'AMD64'}}));assert.ok(supported.findings.some(f=>f.actions.includes('startupDisable')));
});
test('catalog refuses arbitrary commands, extra parameters, protected entries and stale evidence',()=>{
 const d=diagnose(evidence());assert.throws(()=>validateProposal('powershell',{},d));assert.throws(()=>validateProposal('startupDisable',{name:'UserApp',command:'anything'},d));assert.throws(()=>validateProposal('startupDisable',{name:'SecurityHealth'},d));assert.throws(()=>validateProposal('startupDisable',{name:'UserApp'},{...d,at:'2000-01-01'}));assert.doesNotThrow(()=>validateProposal('startupDisable',{name:'UserApp'},d));
 assert.equal(symptomRoute('Minha internet cai quando conecto a VPN').journeys[0],'network');assert.throws(()=>symptomRoute('x'.repeat(1001)));
});
test('cancelled proposals do not execute; required personal backup cannot be skipped',async()=>{
 let called=0;const e=await engine(async()=>{called++;});const d=diagnose(evidence({integrity:{state:'Repairable'}}));const op=await e.propose('integrityRepair',{},d);
 await assert.rejects(e.run(op.id,{confirm:true},d),/backup/);await e.cancel(op.id);await assert.rejects(e.run(op.id,{confirm:true,backupConfirmed:true},d));assert.equal(called,0);
});
test('backup/precondition failure blocks mutation and leaves a durable failed state',async()=>{
 const e=await engine(async()=>{const error=Error('Backup failed');error.beforeExecution=true;throw error;});const d=diagnose(evidence());const op=await e.propose('startupDisable',{name:'UserApp'},d);await assert.rejects(e.run(op.id,{confirm:true},d));assert.equal(op.state,'failed');const saved=JSON.parse(await fs.readFile(path.join(e.folder,op.id+'.json')));assert.equal(saved.state,'failed');assert.equal(saved.authorization.confirm,true);
});
test('exit without verified postcondition remains pending, including official settings',async()=>{
 const e=await engine(async(op,start)=>{await start();return {exitCode:0,validated:false,detail:'Test symptom'};});const d=diagnose(evidence());const op=await e.propose('openApps',{},d);await e.run(op.id,{confirm:true},d);assert.equal(op.state,'awaiting_verification');await e.recordHumanValidation(op.id,true,'Reabri o programa e reproduzi o teste',true);assert.match(op.humanValidation.source,/não verificação automática/);
});
test('concurrent procedure is refused; an interruption is not retried on startup',async()=>{
 let finish;const hold=new Promise(resolve=>{finish=resolve;});const e=await engine(async(op,start)=>{await start();await hold;return {validated:true};});const d=diagnose(evidence());const a=await e.propose('openApps',{},d),b=await e.propose('openApps',{},d);const running=e.run(a.id,{confirm:true},d);await assert.rejects(e.run(b.id,{confirm:true},d),/execução/);finish();await running;
 await e.transition(b,'executing','Simulated interruption');const recovered=await new RepairEngine({folder:e.folder,execute:()=>{throw Error('must not retry');}}).init();assert.equal(recovered.operations.get(b.id).state,'recovery_needed');const next=await recovered.propose('openApps',{},d);await assert.rejects(recovered.run(next.id,{confirm:true},d),/interrompida/);
});
test('restore verifies backup and clears interrupted source without requiring a paid license',async()=>{
 const e=await engine(async(op,start)=>{await start();return {validated:true};});const d=diagnose(evidence());const first=await e.propose('startupDisable',{name:'UserApp'},d);await e.transition(first,'recovery_needed','Interrupted');const restore=await e.propose('startupRestore',{sourceId:first.id},null);await e.run(restore.id,{confirm:true},null);assert.equal(restore.state,'reverted');assert.equal(first.state,'reverted');assert.equal(first.restoredBy,restore.id);assert.equal(featureAllowed('recovery',null),true);
});
test('native timeout or lost result remains recovery_needed, never completed',async()=>{
 const e=await engine(async(op,start)=>{await start();throw Error('Timed out');});const d=diagnose(evidence());const op=await e.propose('startupDisable',{name:'UserApp'},d);await assert.rejects(e.run(op.id,{confirm:true},d));assert.equal(op.state,'recovery_needed');await assert.rejects(e.recordHumanValidation(op.id,true,'Tested after interruption',false));
});
test('journal write failure stops execution; unreadable journal fails closed',async()=>{
 let called=false;const e=await engine(async()=>{called=true;});const d=diagnose(evidence());const op=await e.propose('openApps',{},d);await fs.rename(e.folder,e.folder+'-saved');await fs.writeFile(e.folder,'not a directory');await assert.rejects(e.run(op.id,{confirm:true},d));assert.equal(called,false);
 const bad=await fs.mkdtemp(path.join(os.tmpdir(),'care-bad-'));await fs.writeFile(path.join(bad,op.id+'.json'),'{broken');await assert.rejects(new RepairEngine({folder:bad,execute:()=>{}}).init(),/ilegível/);
});
test('paid entitlements fail closed while basic evidence and recovery stay free',()=>{
 for(const f of features)assert.equal(featureAllowed(f.id,null),f.plan==='free');assert.equal(featureAllowed('arbitrary',{}),false);assert.equal(featureAllowed('driverService',{plan:'advanced'}),true);const raw=evidence({events:available([{id:20,provider:'Microsoft-Windows-WindowsUpdateClient'}])});assert.equal(diagnose(raw,{extended:true}).timeline.length,1);assert.equal(diagnose(raw).timeline.length,0);
});
test('Positivo and Asian manufacturer portals are official-only, without pretending direct installer support',()=>{
 for(const id of ['positivo','asus','acer','msi','gigabyte','samsung','huawei','dynabook','lg']){assert.equal(new URL(manufacturers[id].portal).protocol,'https:');assert.equal(manufacturers[id].hosts.length,0);assert.throws(()=>officialDriverURL(manufacturers[id].portal+'/driver.exe',id));}
});
