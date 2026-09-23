import fs from 'node:fs/promises';
import path from 'node:path';

// Metadata only. Never read file contents or traverse links/junctions.
export async function scanStorage(root,{onProgress=()=>{},cancelled=()=>false,maxEntries=150000,maxMs=120000}={}){
 const result={root,at:new Date().toISOString(),files:[],folders:[],fileCount:0,entries:0,bytes:0,skipped:0,partial:false,reason:null};
 const start=Date.now();let last=0,stopped=false;
 function top(list,item){if(item.bytes<=0)return;list.push(item);list.sort((a,b)=>b.bytes-a.bytes);if(list.length>50)list.length=50;}
 function stop(){if(stopped)return true;const reason=cancelled()?'cancelled':result.entries>=maxEntries?'limit':Date.now()-start>=maxMs?'timeout':null;if(reason){stopped=true;result.partial=true;result.reason=reason;}return stopped;}
 async function walk(dir,depth){
  if(stop())return 0;
  if(depth>100){result.skipped++;result.partial=true;return 0;}
  let handle,total=0;
  try{handle=await fs.opendir(dir);}catch{result.skipped++;result.partial=true;return 0;}
  try{for await(const entry of handle){
   if(stop())break;result.entries++;
   const file=path.join(dir,entry.name);
   if(process.platform!=='win32'&&(['/proc','/sys','/dev','/run','/mnt','/media'].includes(file)||(process.platform==='darwin'&&['/System','/Volumes'].includes(file)))){result.skipped++;result.partial=true;continue;}
   try{const stat=await fs.lstat(file);if(stat.isSymbolicLink()){result.skipped++;continue;}
    if(stat.isDirectory()){const size=await walk(file,depth+1);total+=size;top(result.folders,{path:file,bytes:size});}
    else if(stat.isFile()){total+=stat.size;result.bytes+=stat.size;result.fileCount++;top(result.files,{path:file,bytes:stat.size});}
   }catch{result.skipped++;result.partial=true;}
   if(Date.now()-last>500){last=Date.now();onProgress({...result,files:undefined,folders:undefined});}
  }}catch{result.skipped++;result.partial=true;}
  return total;
 }
 const stat=await fs.lstat(root);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Pasta de origem inválida.');
 await walk(root,0);result.elapsedMs=Date.now()-start;return result;
}
