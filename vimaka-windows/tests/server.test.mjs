import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
test('API local bloqueia origens externas, ações arbitrárias e roteiros não revisados',async()=>{
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
  assert.equal((await post('package',{id:'__proto__',confirm:true})).status,400);
  assert.equal((await post('sandbox',{id:'not-reviewed',hash:'x',confirm:true,network:false})).status,400);
  const draft=await(await post('draft',{text:'Write-Output "isolado"'})).json();
  assert.equal(draft.script,'Write-Output "isolado"');
  assert.equal((await post('sandbox',{id:draft.id,hash:'changed',confirm:true,network:false})).status,400);
  const state=await(await fetch(base+'/api/state')).json();assert.equal(state.jobs.length,0);
  assert.equal((await fetch(base+'/%2e%2e%5cserver.mjs')).status,403);
 }finally{server.kill();/* Temp contains no private data. Retained for diagnostics. */}
});
