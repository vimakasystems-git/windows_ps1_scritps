import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const base='http://127.0.0.1:47831';
if(!['linux','darwin'].includes(process.platform))throw Error('Use the Windows installer on Windows.');
async function online(){try{const r=await fetch(base+'/api/session',{signal:AbortSignal.timeout(1000)});const s=await r.json();return s.local===true&&s.platform===process.platform;}catch{return false;}}
if(!await online()){
 const child=spawn(process.execPath,[fileURLToPath(new URL('./server.mjs',import.meta.url))],{stdio:'inherit'});
 child.on('error',error=>{console.error(error.message);process.exitCode=1;});
 const stop=()=>child.kill('SIGTERM');process.on('SIGINT',stop);process.on('SIGTERM',stop);
 let ready=false;for(let i=0;i<30;i++){if(await online()){ready=true;break;}if(child.exitCode!==null)throw Error('Local server failed to start.');await new Promise(r=>setTimeout(r,300));}
 if(!ready){stop();throw Error('Could not connect to Vimaka Care.');}
 console.log('Keep this terminal open while using Vimaka Care. Press Ctrl+C to stop.');
}
console.log(base);
const browser=spawn(process.platform==='darwin'?'/usr/bin/open':'xdg-open',[base],{stdio:'ignore'});
browser.on('error',()=>console.log('Open the URL above in your browser.'));
