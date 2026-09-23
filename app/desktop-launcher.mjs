import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {stopLocal} from './stop-local.mjs';
const base='http://127.0.0.1:47831';
const version=JSON.parse(await fs.readFile(new URL('./package.json',import.meta.url),'utf8')).version;
async function session(){try{return await(await fetch(base+'/api/session',{signal:AbortSignal.timeout(1000)})).json();}catch{return null;}}
let current=await session();
if(current&&current.version!==version){await stopLocal();current=null;}
if(!current){
 const child=spawn(process.execPath,[fileURLToPath(new URL('./server.mjs',import.meta.url))],{detached:true,stdio:'ignore'});
 await new Promise((resolve,reject)=>{child.once('error',reject);child.once('spawn',resolve);});child.unref();
 for(let n=0;n<40;n++){current=await session();if(current?.local&&current.version===version)break;await new Promise(r=>setTimeout(r,250));}
}
if(!current?.local||current.version!==version)throw Error('Não foi possível iniciar o componente local.');
const browser=spawn(process.platform==='darwin'?'/usr/bin/open':'xdg-open',[base],{stdio:'ignore'});
browser.on('error',()=>console.error('Abra '+base));
