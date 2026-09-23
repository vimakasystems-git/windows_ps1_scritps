import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export const isWindows=process.platform==='win32';
export const systemName=process.platform==='darwin'?'macOS':process.platform==='linux'?'Linux':'Windows';
export const portableActions={network:{name:'Diagnosticar rede',detail:'Exibe interfaces de rede locais. Não altera a rede.',admin:false}};
export function dataDirectory(){return isWindows?path.join(process.env.LOCALAPPDATA||os.homedir(),'VimakaWindowsCare','data'):process.platform==='darwin'?path.join(os.homedir(),'Library','Application Support','VimakaCare'):path.join(process.env.XDG_DATA_HOME||path.join(os.homedir(),'.local','share'),'vimaka-care');}
async function read(file){return fs.readFile(file,'utf8').then(s=>s.trim()).catch(()=>null);}
async function command(file,args){try{return (await exec(file,args,{timeout:15000,maxBuffer:4*1024*1024,env:{...process.env,LC_ALL:'C'}})).stdout.trim();}catch{return null;}}
async function entries(folder,suffix){try{return (await fs.readdir(folder)).filter(n=>n.endsWith(suffix));}catch{return [];}}
export async function portableStorage(){
 const roots=[];for(const root of [...new Set([os.homedir(),'/'])]){try{const s=await fs.statfs(root);roots.push({id:root,label:root,totalBytes:s.blocks*s.bsize,freeBytes:s.bavail*s.bsize});}catch{}}
 let programs=[];
 if(process.platform==='linux'){
  const out=await command('dpkg-query',['-W','-f=${Package}\t${Installed-Size}\t${Version}\n']);
  if(out)programs=out.split('\n').map(line=>{const [name,size,version]=line.split('\t');return {name,version,bytes:Number.isFinite(Number(size))?Number(size)*1024:null};});
  else{const rpm=await command('rpm',['-qa','--qf','%{NAME}\t%{SIZE}\t%{VERSION}\n']);if(rpm)programs=rpm.split('\n').map(line=>{const [name,size,version]=line.split('\t');return {name,version,bytes:Number(size)||null};});}
 }else if(process.platform==='darwin'){
  for(const folder of ['/Applications',path.join(os.homedir(),'Applications')])for(const name of await entries(folder,'.app'))programs.push({name,version:'',bytes:null});
 }
 return {roots,programs:programs.sort((a,b)=>(b.bytes||0)-(a.bytes||0))};
}
export async function portableSnapshot(){
 const mem=os.totalmem(),free=os.freemem(),cpu=os.cpus(),storage=await portableStorage();
 const name=systemName;let model=os.arch(),version=os.release(),startup=[];
 if(process.platform==='linux'){
  model=await read('/sys/devices/virtual/dmi/id/product_name')||model;
  const distro=await read('/etc/os-release');version=distro?.match(/^PRETTY_NAME="?([^"\n]+)/m)?.[1]||version;
  startup=[...await entries('/etc/xdg/autostart','.desktop'),...await entries(path.join(os.homedir(),'.config','autostart'),'.desktop')];
 }else{
  model=await command('/usr/sbin/sysctl',['-n','hw.model'])||model;
  version=await command('/usr/bin/sw_vers',['-productVersion'])||version;
  startup=[...await entries('/Library/LaunchAgents','.plist'),...await entries(path.join(os.homedir(),'Library','LaunchAgents'),'.plist')];
 }
 const homeRoot=storage.roots.find(r=>r.id===os.homedir());
 return {at:new Date().toISOString(),os:name+' '+version,version,model,manufacturer:process.platform==='darwin'?'Apple':'',architecture:os.arch(),lastBoot:new Date(Date.now()-os.uptime()*1000).toISOString(),cpu:cpu.length?[{Name:cpu[0].model,NumberOfLogicalProcessors:cpu.length}]:[],gpu:[],memory:[],disks:[],restartPending:null,freeGB:free/1073741824,totalGB:mem/1073741824,startup,remojo:null,power:null,drives:homeRoot?[{name:os.homedir(),freeGB:homeRoot.freeBytes/1073741824,totalGB:homeRoot.totalBytes/1073741824}]:[],network:Object.keys(os.networkInterfaces()).map(Name=>({Name,Status:'Detected',LinkSpeed:'Not measured'})),processes:[],platform:process.platform,limitations:['Initial Linux/macOS preview: no automated repairs or power tuning.','Startup entries are a partial inventory, not all login items.','Memory free is OS free memory, not necessarily available memory.','macOS app sizes and GPU inventory are not collected in this preview.']};
}
export function portableNetwork(){return JSON.stringify(os.networkInterfaces(),null,2);}
