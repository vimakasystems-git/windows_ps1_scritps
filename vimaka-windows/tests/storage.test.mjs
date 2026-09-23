import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {scanStorage} from '../storage.mjs';
test('storage totals nested folders, sorts files, ignores junctions and leaves files intact',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'vimaka-storage-test-'));
 await fs.mkdir(path.join(root,'nested'));
 await fs.writeFile(path.join(root,'small.bin'),Buffer.alloc(10));
 await fs.writeFile(path.join(root,'nested','large.bin'),Buffer.alloc(100));
 await fs.symlink(root,path.join(root,'nested','loop'),'junction');
 const r=await scanStorage(root);
 assert.equal(r.bytes,110);assert.equal(r.fileCount,2);assert.equal(r.files[0].bytes,100);assert.equal(r.folders[0].bytes,100);assert.equal(r.skipped,1);assert.equal((await fs.stat(path.join(root,'small.bin'))).size,10);
 const stopped=await scanStorage(root,{cancelled:()=>true});assert.equal(stopped.partial,true);assert.equal(stopped.reason,'cancelled');
 const limited=await scanStorage(root,{maxEntries:1});assert.equal(limited.partial,true);assert.equal(limited.reason,'limit');
});
