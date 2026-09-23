import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {createHash,randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
if(!isMainThread&&workerData?.vimakaBenchmark){
 const block=Buffer.alloc(1024*1024,0x5a),values=[];
 for(let round=0;round<4;round++){const start=performance.now();let count=0;while(performance.now()-start<750){createHash('sha256').update(block).digest();count++;}if(round)values.push(count/((performance.now()-start)/1000));}
 const target=Buffer.alloc(block.length),copies=[];
 for(let round=0;round<3;round++){const start=performance.now();let count=0;while(performance.now()-start<300){block.copy(target);count++;}copies.push(count/((performance.now()-start)/1000));}
 parentPort.postMessage({cpuSha256MiBs:median(values),memoryCopyMiBs:median(copies),cpuSamples:values});
}
export async function benchmark(folder){
 const result=await new Promise((resolve,reject)=>{const worker=new Worker(new URL(import.meta.url),{execArgv:[],workerData:{vimakaBenchmark:true}});const timeout=setTimeout(()=>{worker.terminate();reject(Error('Benchmark excedeu 30 segundos.'));},30000);worker.once('message',value=>{clearTimeout(timeout);resolve(value);});worker.once('error',e=>{clearTimeout(timeout);reject(e);});worker.once('exit',code=>{if(code!==0){clearTimeout(timeout);reject(Error('Benchmark interrompido.'));}});});
 const file=path.join(folder,'benchmark-'+randomUUID()+'.tmp');const bytes=32*1024*1024;
 try{const data=Buffer.alloc(bytes,0x39),start=performance.now();const handle=await fs.open(file,'wx');try{await handle.writeFile(data);await handle.sync();}finally{await handle.close();}result.fileWriteMiBs=32/((performance.now()-start)/1000);const readStart=performance.now();await fs.readFile(file);result.cachedFileReadMiBs=32/((performance.now()-readStart)/1000);}finally{await fs.unlink(file).catch(()=>{});}
 return {...result,at:new Date().toISOString(),protocol:'vimaka-micro-v1',runtime:process.version,platform:process.platform,arch:process.arch,singleThread:true,fileSizeBytes:bytes};
}
