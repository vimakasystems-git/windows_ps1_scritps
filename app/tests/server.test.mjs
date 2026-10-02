import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
test('API local bloqueia origens externas, ações arbitrárias e endpoints removidos',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vimaka-api-test-'));
 const server=spawn(process.execPath,['server.mjs'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,VIMAKA_PORT:'47839',VIMAKA_DATA:dir},windowsHide:true});
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(Error('Servidor encerrou: '+c)));});
  const base='http://127.0.0.1:47839';
  const session=await(await fetch(base+'/api/session')).json();
  const post=(route,body,headers={})=>fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,'X-Vimaka-Token':session.csrf,...headers},body:JSON.stringify(body)});
  assert.equal((await post('scan',{}, {Origin:'https://example.com'})).status,403);
  assert.equal((await post('scan',{}, {'X-Vimaka-Token':'wrong'})).status,403);
  const hostStatus=await new Promise((resolve,reject)=>{http.get(base+'/api/session',{headers:{Host:'attacker.example:47839'}},r=>{r.resume();resolve(r.statusCode);}).once('error',reject);});
  assert.equal(hostStatus,403);
  assert.equal((await post('action',{id:'cmd.exe',confirm:true})).status,400);
  assert.equal((await post('workflow',{mode:'invalid',confirm:true})).status,400);
  assert.equal((await post('workflow',{mode:'performance'})).status,400);
  assert.equal((await post('storage/scan',{root:'profile'},{Origin:'https://example.com'})).status,403);
  assert.equal((await post('storage/cancel',{id:'missing'})).status,400);
  for(const route of ['draft','package','sandbox'])assert.equal((await post(route,{id:'git',text:'Write-Output "test"',confirm:true})).status,404);
  assert.equal((await post('action',{id:'sandboxEnable',confirm:true})).status,400);
  assert.equal((await post('scan',{})).status,400);
  assert.equal((await post('care/consent',{terms:true,license:false})).status,400);
  assert.equal((await post('care/consent',{terms:true,license:true})).status,200);
  for(const id of ['energy','dns','health','repair'])assert.equal((await post('action',{id,confirm:true})).status,400);
  assert.equal((await post('workflow',{mode:'performance',confirm:true})).status,400);
  assert.equal((await post('diagnosis/collect',{extended:true})).status,400);
  assert.equal((await post('diagnosis/collect',{probeNetwork:true,networkConsent:false})).status,400);
  assert.equal((await post('repairs/propose',{action:'arbitrary',params:{}})).status,400);
  const symptoms=await post('symptoms',{text:'Internet cai com VPN'});assert.equal(symptoms.status,200);assert.deepEqual((await symptoms.json()).journeys,['network']);
  assert.equal((await post('care/report',{profile:'technician'})).status,400);
  for(const route of ['drivers/download','drivers/install','drivers/configure']){const response=await post(route,{confirm:true});assert.equal(response.status,400);assert.match((await response.json()).error,/pago|paga/);}
  assert.equal((await post('drivers/scan',{confirm:false})).status,400);
  assert.equal((await post('care/content',{categories:['injected'],confirm:true})).status,400);
  const state=await(await fetch(base+'/api/state')).json();assert.equal(state.jobs.length,0);assert.equal(state.actions.sandboxEnable,undefined);assert.equal(state.packages,undefined);assert.equal(state.sandboxPresent,undefined);
  assert.equal(state.entitlements.paid,false);assert.equal(state.entitlements.features.find(f=>f.id==='recovery').plan,'free');assert.equal(state.actions.energy,undefined);assert.deepEqual(state.repairOperations,[]);
  assert.equal((await fetch(base+'/%2e%2e%5cserver.mjs')).status,403);
 }finally{server.kill();/* Temp contains no private data. Retained for diagnostics. */}
});
