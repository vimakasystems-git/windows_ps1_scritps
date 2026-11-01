import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {officialDriverURL,requireDriverSelection,requireDriverVendor,downloadOfficialDriver} from '../drivers.mjs';
import {buildPixPayload,crc16} from '../pix.mjs';
test('driver downloads accept only exact official vendor domains and EXE over HTTPS',()=>{
 assert.equal(officialDriverURL('https://dl.dell.com/driver.exe','dell').hostname,'dl.dell.com');
 for(const url of ['http://dl.dell.com/a.exe','https://dl.dell.com.evil.example/a.exe','https://evil@dl.dell.com/a.exe','https://dl.dell.com:444/a.exe','https://127.0.0.1/a.exe','https://dl.dell.com/a.zip','https://drivers.amd.com/a.exe'])assert.throws(()=>officialDriverURL(url,'dell'));
});
test('driver selection requires recent inventory, known device and compatibility consent',()=>{const scan={at:new Date().toISOString(),devices:[{DeviceID:'PCI\\TEST'}]};assert.equal(requireDriverSelection(scan,'PCI\\TEST',true).DeviceID,'PCI\\TEST');assert.throws(()=>requireDriverSelection(scan,'other',true));assert.throws(()=>requireDriverSelection(scan,'PCI\\TEST',false));assert.throws(()=>requireDriverSelection({...scan,at:'2000-01-01'},'PCI\\TEST',true));});
test('vendor must match component hardware or computer OEM',()=>{const device={DeviceID:'PCI\\VEN_10DE&TEST'};assert.doesNotThrow(()=>requireDriverVendor({},device,'nvidia'));assert.throws(()=>requireDriverVendor({},device,'intel'));assert.doesNotThrow(()=>requireDriverVendor({computer:{Manufacturer:'Dell Inc.'}},device,'dell'));assert.throws(()=>requireDriverVendor({computer:{Manufacturer:'Dell Inc.'}},device,'hp'));});
test('download rejects a redirect to another vendor or third party',async()=>{const folder=await fs.mkdtemp(path.join(os.tmpdir(),'care-driver-test-'));await assert.rejects(downloadOfficialDriver({url:'https://dl.dell.com/a.exe',vendor:'dell',folder,fetcher:async()=>new Response(null,{status:302,headers:{location:'https://evil.example/a.exe'}})}));assert.equal((await fs.readdir(folder)).length,0);});
test('download hashes bytes and removes truncated packages',async()=>{const folder=await fs.mkdtemp(path.join(os.tmpdir(),'care-driver-test-')),bytes=Buffer.from('unsigned test fixture — never installed');const pkg=await downloadOfficialDriver({url:'https://dl.dell.com/a.exe',vendor:'dell',folder,fetcher:async()=>new Response(bytes,{headers:{'content-length':String(bytes.length)}})});assert.equal(pkg.sha256,createHash('sha256').update(bytes).digest('hex'));await assert.rejects(downloadOfficialDriver({url:'https://dl.dell.com/a.exe',vendor:'dell',folder,fetcher:async()=>new Response(bytes,{headers:{'content-length':'999'}})}));assert.equal((await fs.readdir(folder)).length,1);});
test('commercial Pix includes exact BRL price with valid checksum; donations remain free amount',()=>{const settings={key:'+5511945546072',name:'Douglas Cardoso',city:'Sao Paulo'};const payload=buildPixPayload({...settings,amount:19.99});assert.match(payload,/540519.99/);assert.equal(payload.slice(-4),crc16(payload.slice(0,-4)));assert.doesNotMatch(buildPixPayload(settings),/540519.99/);for(const amount of [-1,0,NaN,19.999])assert.throws(()=>buildPixPayload({...settings,amount}));});
test('Windows validator rejects unsigned or modified package without executing it',{skip:process.platform!=='win32'},async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'care-signature-test-')),pkg=path.join(folder,'unsigned.exe'),result=path.join(folder,'result.json'),bytes=Buffer.from('This file is not an executable and must never be launched.');await fs.writeFile(pkg,bytes);
 const script=fileURLToPath(new URL('../../platforms/windows/native/DriverService.ps1',import.meta.url));const ps=path.join(process.env.WINDIR,'System32','WindowsPowerShell','v1.0','powershell.exe');
 for(const hash of ['0'.repeat(64),createHash('sha256').update(bytes).digest('hex')]){await assert.rejects(promisify(execFile)(ps,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,'-Mode','validate','-Package',pkg,'-Sha256',hash,'-Vendor','nvidia','-ResultFile',result],{windowsHide:true,timeout:30000}));const status=JSON.parse((await fs.readFile(result,'utf8')).replace(/^\uFEFF/,''));assert.equal(status.ok,false);assert.match(status.error,/alterado|Assinatura/);}
});
