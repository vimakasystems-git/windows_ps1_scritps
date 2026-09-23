import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {actions,packages,safeAction,safePackage,extractScript,hash,sandboxConfig} from './core.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const data=process.env.VIMAKA_DATA || path.join(process.env.LOCALAPPDATA||os.homedir(),'VimakaWindowsCare','data');
const port=Number(process.env.VIMAKA_PORT||47831), origin=`http://127.0.0.1:${port}`;
const ps=path.join(process.env.WINDIR||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
await fs.mkdir(data,{recursive:true});
const jobs=new Map(), drafts=new Map(), csrf=crypto.randomBytes(32).toString('hex');
const jsonRead=async(file,fallback)=>{try{return JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));}catch{return fallback;}};
async function persist(){await fs.writeFile(path.join(data,'history.json'),JSON.stringify([...jobs.values()].slice(-100),null,2));}
for(const job of await jsonRead(path.join(data,'history.json'),[])){if(job.status==='running'){job.status='interrupted';job.log+='\nAplicativo reiniciado; resultado anterior não confirmado.';}jobs.set(job.id,job);}
function processRun(file,args,job,timeout=1800000){return new Promise((resolve,reject)=>{
  const child=spawn(file,args,{windowsHide:true,cwd:here,shell:false});
  let output='';const timer=setTimeout(()=>{child.kill();reject(Error('Tempo limite excedido; confira processos externos antes de repetir.'));},timeout);
  const append=chunk=>{output=(output+chunk.toString()).slice(-150000);if(job)job.log=output;};
  child.stdout.on('data',append);child.stderr.on('data',append);
  child.once('error',err=>{clearTimeout(timer);reject(err);});
  child.once('close',code=>{clearTimeout(timer);if(code!==0)reject(Error(`Código ${code}: ${output.slice(-6000)}`));else resolve(output);});
});}
function runPS(file,args=[],job,timeout){return processRun(ps,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(here,'native',file),...args],job,timeout);}
function newJob(title,work){
  if([...jobs.values()].some(j=>j.status==='running'))throw Error('Aguarde a operação atual terminar.');
  const job={id:crypto.randomUUID(),title,status:'running',at:new Date().toISOString(),log:''};jobs.set(job.id,job);
  (async()=>{try{await persist();await work(job);job.status='success';}catch(e){job.status='failed';job.log+='\n'+e.message;}job.finishedAt=new Date().toISOString();await persist();})().catch(console.error);
  return job;
}
async function body(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>120000)throw Error('Dados acima do limite.');}return JSON.parse(s||'{}');}
function send(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function snapshot(job){
  const result=JSON.parse((await runPS('Collect.ps1',[],job,90000)).replace(/^\uFEFF/,''));
  const state=await jsonRead(path.join(data,'comparison.json'),{});
  state.before??=result;state.current=result;
  await fs.writeFile(path.join(data,'comparison.json'),JSON.stringify(state,null,2));return result;
}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  try{
    if(req.headers.host!==`127.0.0.1:${port}`)return send(res,403,{error:'Host não autorizado.'});
    if(req.headers.origin && req.headers.origin!==origin)return send(res,403,{error:'Origem não autorizada.'});
    if(req.headers['sec-fetch-site']==='cross-site')return send(res,403,{error:'Acesso externo não permitido.'});
    const url=new URL(req.url,origin);
    if(req.method==='GET'&&url.pathname==='/api/session')return send(res,200,{csrf,version:'0.1.2',local:true});
    if(url.pathname.startsWith('/api/')&&req.method!=='GET'){
      if(req.headers.origin!==origin||req.headers['x-vimaka-token']!==csrf||!req.headers['content-type']?.startsWith('application/json'))return send(res,403,{error:'Sessão local inválida. Reabra o aplicativo.'});
    }
    if(req.method==='GET'&&url.pathname==='/api/state'){
      const sandboxPresent=await fs.access(path.join(process.env.WINDIR||'C:\\Windows','System32','WindowsSandbox.exe')).then(()=>true,()=>false);
      const sandboxRestartRequired=!sandboxPresent&&[...jobs.values()].some(j=>j.title===actions.sandboxEnable.name&&j.status==='success'&&/Reinicio necessario: True/.test(j.log));
      return send(res,200,{comparison:await jsonRead(path.join(data,'comparison.json'),{}),actions,packages,jobs:[...jobs.values()].reverse().slice(0,100),sandboxPresent,sandboxRestartRequired});
    }
    if(req.method==='POST'&&url.pathname==='/api/scan')return send(res,202,newJob('Diagnóstico do computador',snapshot));
    if(req.method==='POST'&&url.pathname==='/api/action'){
      const b=await body(req),action=safeAction(b.id);if(b.confirm!==true)throw Error('Revise e confirme a ação.');
      return send(res,202,newJob(action.name,async job=>{
        const file=path.join(data,job.id+'.result.json');
        let failure;try{await runPS('Invoke-Action.ps1',['-Action',b.id,'-ResultFile',file],job);}catch(e){failure=e;}
        const result=await jsonRead(file,null);if(!result)throw Error('Nenhum resultado recebido.');
        job.log=result.output||'';if(!result.ok)throw Error(result.error||'Ação falhou.');
        if(failure)throw failure;
      }));
    }
    if(req.method==='POST'&&url.pathname==='/api/draft'){
      const b=await body(req),draft={...extractScript(b.text),id:crypto.randomUUID(),created:Date.now()};drafts.set(draft.id,draft);return send(res,200,draft);
    }
    if(req.method==='POST'&&url.pathname==='/api/sandbox'){
      const b=await body(req),draft=drafts.get(b.id);
      if(!draft||b.hash!==draft.hash||Date.now()-draft.created>1800000||b.confirm!==true)throw Error('Revise novamente o roteiro antes de executar.');
      if(typeof b.network!=='boolean')throw Error('Defina explicitamente o acesso à rede.');
      const exe=path.join(process.env.WINDIR||'C:\\Windows','System32','WindowsSandbox.exe');
      await fs.access(exe).catch(()=>{throw Error('Windows Sandbox indisponível. Habilite o recurso e reinicie quando solicitado.');});
      const job=newJob('Abrir teste isolado',async job=>{
        const folder=path.join(data,'sandbox',job.id);await fs.mkdir(folder,{recursive:true});
        await fs.writeFile(path.join(folder,'proposal.ps1'),'\uFEFF'+draft.script);
        const downloaded=path.join(data,'packages');
        await fs.cp(downloaded,path.join(folder,'packages'),{recursive:true}).catch(e=>{if(e.code!=='ENOENT')throw e;});
        const bootstrap="$ErrorActionPreference='Stop'\n$dest=Join-Path $env:USERPROFILE 'Desktop\\Vimaka-Teste'\nNew-Item $dest -ItemType Directory -Force | Out-Null\nCopy-Item 'C:\\VimakaInput\\*' $dest -Recurse -Force\nSet-Location $dest\nStart-Transcript (Join-Path $dest 'resultado.txt')\ntry { & '.\\proposal.ps1' } catch { Write-Error $_ } finally { Stop-Transcript }\nWrite-Host 'Teste isolado concluido. Os arquivos desaparecem ao fechar a sandbox.'\n";
        await fs.writeFile(path.join(folder,'run.ps1'),'\uFEFF'+bootstrap);
        const wsb=path.join(data,'sandbox',job.id+'.wsb');await fs.writeFile(wsb,sandboxConfig(folder,b.network));
        const child=spawn(exe,[wsb],{windowsHide:false,detached:true,stdio:'ignore'});
        await new Promise((resolve,reject)=>{child.once('error',reject);child.once('spawn',resolve);});child.unref();
        job.log='Inicialização solicitada ao Windows Sandbox. Isso não confirma o sucesso do roteiro. Veja resultado.txt dentro da sandbox. Rede: '+(b.network?'habilitada':'desabilitada')+'. Compartilhamento somente leitura.';drafts.delete(b.id);
      });return send(res,202,job);
    }
    if(req.method==='POST'&&url.pathname==='/api/package'){
      const b=await body(req),id=safePackage(b.id);if(b.confirm!==true)throw Error('Confirme o download.');
      return send(res,202,newJob('Baixar '+id,async job=>{
        const folder=path.join(data,'packages',b.id);await fs.mkdir(folder,{recursive:true});
        await runPS('Download.ps1',['-Package',id,'-Destination',folder],job);
        const names=await fs.readdir(folder);job.log+='\nArquivos baixados: '+names.join(', ')+'\nDisponíveis em .\\packages\\'+b.id+' dentro da sandbox. Nada instalado no host.';
      }));
    }
    if(req.method==='POST'&&url.pathname==='/api/open-cerebro'){
      await runPS('Open-Cerebro.ps1');return send(res,200,{opened:true});
    }
    if(req.method==='POST'&&url.pathname==='/api/shutdown'){
      const b=await body(req);if(b.confirm!==true||[...jobs.values()].some(j=>j.status==='running'))throw Error('Conclua as operações antes de encerrar.');
      send(res,200,{stopped:true});setTimeout(()=>server.close(()=>process.exit(0)),200);return;
    }
    if(req.method!=='GET')return send(res,404,{error:'Rota inexistente.'});
    if(url.pathname.startsWith('/api/'))return send(res,404,{error:'Rota inexistente.'});
    const rel=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
    const root=path.join(here,'public'),file=path.resolve(root,rel);
    if(!file.startsWith(root+path.sep))return send(res,403,{error:'Caminho inválido.'});
    const content=await fs.readFile(file).catch(()=>null);if(!content)return send(res,404,{error:'Arquivo inexistente.'});
    const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.ico':'image/x-icon'}[path.extname(file)]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});res.end(content);
  }catch(e){send(res,400,{error:e.message});}
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(port,'127.0.0.1',()=>console.log('Vimaka Windows Care: '+origin));
