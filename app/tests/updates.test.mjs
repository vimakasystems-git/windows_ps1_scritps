import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {targetFor,newer,selectRelease,createUpdater,repository} from '../updates.mjs';
test('update selects OS, package family and CPU architecture without cross-installing',()=>{
 assert.equal(targetFor('win32','x64').suffix,'windows-x64.exe');
 for(const arch of ['x64','arm64']){
  assert.equal(targetFor('darwin',arch).suffix,`macos-${arch}.pkg`);
  assert.equal(targetFor('linux',arch,'ID=ubuntu').suffix,`linux-${arch}.deb`);
  assert.equal(targetFor('linux',arch,'ID=rocky\nID_LIKE="rhel centos fedora"').suffix,`linux-${arch}.rpm`);
 }
 assert.throws(()=>targetFor('linux','x64','ID=arch'));
 assert.throws(()=>targetFor('win32','arm64'));
 assert.ok(newer('0.10.0','0.9.0'));assert.equal(newer('0.2.0','0.3.0'),false);
 assert.equal(newer('0.4.0-beta','0.3.0'),false);
});
function release(bytes){const name='VimakaWorkstationCare-0.4.0-windows-x64.exe';return {tag_name:'v0.4.0',assets:[{name,browser_download_url:`https://github.com/${repository}/releases/download/v0.4.0/${name}`,size:bytes.length,digest:'sha256:'+createHash('sha256').update(bytes).digest('hex')}]};}
test('updater rejects foreign URLs, missing hashes and incomplete releases',()=>{
 const r=release(Buffer.from('fixture')),target=targetFor('win32','x64');
 assert.ok(selectRelease(r,'0.3.0',target).available);
 assert.equal(selectRelease(r,'0.4.0',target).available,false);
 assert.throws(()=>selectRelease({...r,prerelease:true},'0.3.0',target));
 assert.throws(()=>selectRelease({...r,assets:[]},'0.3.0',target));
 r.assets[0].browser_download_url='https://example.com/installer.exe';
 assert.throws(()=>selectRelease(r,'0.3.0',target));
});
test('download verifies bytes and removes a corrupted installer',async()=>{
 const original=globalThis.fetch,bytes=Buffer.from('test installer data'),r=release(bytes);
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vimaka-update-test-'));
 const updater=createUpdater({current:'0.3.0',data:dir,platform:'win32',arch:'x64'});
 try{
  globalThis.fetch=async url=>String(url).includes('api.github.com')?Response.json(r):new Response(bytes);
  const job={};await updater.download(job);assert.equal(job.progress,100);assert.ok(job.update.id);
  assert.equal((await fs.readdir(path.join(dir,'updates'))).length,1);
  globalThis.fetch=async url=>String(url).includes('api.github.com')?Response.json(r):new Response('corrupted');
  await assert.rejects(updater.download({}),/Checksum/);
  assert.equal((await fs.readdir(path.join(dir,'updates'))).length,1);
  await assert.rejects(updater.open('../../anything'),/novamente/);
 }finally{globalThis.fetch=original;}
});
