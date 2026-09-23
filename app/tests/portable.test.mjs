import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
test('portable diagnostic generates a measured report and rejects Windows tuning', {skip:process.platform==='win32',timeout:90000}, async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vimaka-portable-'));
 const server=spawn(process.execPath,['server.mjs'],{cwd:process.env.VIMAKA_TEST_APP_DIR||fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,VIMAKA_PORT:'47840',VIMAKA_DATA:dir}});
 let output='';server.stderr.on('data',c=>output+=c);
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(Error(output+' Exit '+c)));});
  const base='http://127.0.0.1:47840';
  const session=await(await fetch(base+'/api/session')).json();
  assert.equal(session.platform,process.platform);
  const post=(route,body)=>fetch(base+'/api/'+route,{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Vimaka-Token':session.csrf},body:JSON.stringify(body)});
  assert.equal((await post('workflow',{mode:'performance',confirm:true})).status,400);
  assert.equal((await post('action',{id:'energy',confirm:true})).status,400);
  const response=await post('scan',{});assert.equal(response.status,202);
  const job=await response.json();let state;
  for(let n=0;n<120;n++){
   state=await(await fetch(base+'/api/state')).json();
   if(state.jobs.find(j=>j.id===job.id)?.status!=='running')break;
   await new Promise(r=>setTimeout(r,500));
  }
  const done=state.jobs.find(j=>j.id===job.id);
  assert.equal(done.status,'success',JSON.stringify(done));
  assert.equal(done.progress,100);
  assert.ok(state.comparison.current.totalGB>0);
  assert.equal(state.comparison.current.platform,process.platform);
  assert.ok(state.comparison.diagnosticReport);
  assert.ok(state.comparison.benchmarkAfter.cpuSha256MiBs>0);
  assert.equal(state.comparison.benchmarkAfter.platform,process.platform);
  assert.deepEqual(Object.keys(state.actions),['network']);
  const options=await(await fetch(base+'/api/storage/options')).json();
  assert.ok(options.roots.some(r=>r.id==='profile'));
  assert.ok((await fs.readdir(path.join(dir,'reports'))).length);
 }finally{server.kill();}
});
