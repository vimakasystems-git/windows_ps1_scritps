import {scanStorage} from './storage.mjs';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {actions,safeAction} from './core.mjs';
import {benchmark} from './benchmark.mjs';
import {makeSteps,executeSteps} from './workflow.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const data=process.env.VIMAKA_DATA || path.join(process.env.LOCALAPPDATA||os.homedir(),'VimakaWindowsCare','data');
const port=Number(process.env.VIMAKA_PORT||47831), origin=`http://127.0.0.1:${port}`;
const ps=path.join(process.env.WINDIR||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
await fs.mkdir(data,{recursive:true});
let storageInfo;
async function getStorageInfo(){storageInfo??=JSON.parse((await runPS('StorageInfo.ps1',[],undefined,30000)).replace(/^\uFEFF/,''));return storageInfo;}
const jobs=new Map(), csrf=crypto.randomBytes(32).toString('hex');
const jsonRead=async(file,fallback)=>{try{return JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));}catch{return fallback;}};
async function persist(){await fs.writeFile(path.join(data,'history.json'),JSON.stringify([...jobs.values()].slice(-100),null,2));}
for(const job of await jsonRead(path.join(data,'history.json'),[])){if(job.status==='running'){job.status='interrupted';job.finishedAt=new Date().toISOString();job.currentStep='Interrompido';for(const step of job.steps||[]){if(['running','pending'].includes(step.status))step.status='interrupted';}job.log+='\nAplicativo reiniciado; resultado anterior não confirmado.';}jobs.set(job.id,job);}
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
  (async()=>{try{await persist();await work(job);job.status=job.hasWarnings?'warning':'success';}catch(e){job.status='failed';job.log+='\n'+e.message;}job.finishedAt=new Date().toISOString();await persist();})().catch(console.error);
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
async function executeAction(id,job){
 const action=safeAction(id);const file=path.join(data,crypto.randomUUID()+'.result.json');
 const prefix=job.log+'\n--- '+action.name+' ---\n';job.log=prefix;
 const timer=setInterval(async()=>{try{const text=await fs.readFile(file+'.progress.log','utf8');job.log=(prefix+text).slice(-150000);}catch{}},750);
 let failure;
 try{await runPS('Invoke-Action.ps1',['-Action',id,'-ResultFile',file],undefined);}catch(e){failure=e;}finally{clearInterval(timer);}
 const result=await jsonRead(file,null);if(!result)throw Error('Nenhum resultado recebido.');
 job.log=(prefix+(result.output||'')).slice(-150000);if(!result.ok)throw Error(result.error||'Ação falhou.');if(failure)throw failure;
}
function workflow(mode){
 const steps=makeSteps(mode);
 return newJob(mode==='performance'?'Melhorar desempenho':mode==='benchmark'?'Benchmark local':'Diagnóstico completo',async job=>{
  job.steps=steps;job.progress=0;job.mode=mode;
  await executeSteps(job,async step=>{
   if(['inventory','before','after'].includes(step.id)){
    const snap=await snapshot();if(step.id==='before')job.before=snap;else job.after=snap;
   }else if(['benchmark','benchmarkBefore','benchmarkAfter'].includes(step.id)){
    const metric=await benchmark(data);if(step.id==='benchmarkBefore')job.benchmarkBefore=metric;else job.benchmarkAfter=metric;
   }else if(step.id==='report'){
    const comparison=await jsonRead(path.join(data,'comparison.json'),{});
    if(mode==='performance'&&job.before&&job.after){comparison.before=job.before;comparison.current=job.after;comparison.notes='Comparação desta execução. Variações de carga e temperatura afetam as leituras.';}
    comparison.benchmarkBefore=mode==='benchmark'?(comparison.benchmarkAfter||null):(job.benchmarkBefore||null);comparison.benchmarkAfter=job.benchmarkAfter||null;comparison.reportJob=job.id;
    await fs.writeFile(path.join(data,'comparison.json'),JSON.stringify(comparison,null,2));
    await fs.mkdir(path.join(data,'reports'),{recursive:true});await fs.writeFile(path.join(data,'reports',job.id+'.json'),JSON.stringify({jobId:job.id,mode,comparison},null,2));
   }else{
    if(mode==='performance'&&!job.before)throw Error('Diagnóstico inicial indisponível; ajuste não executado.');
    if(step.id==='repair'&&job.before?.restartPending)return {skip:true,detail:'Reinicie o Windows para concluir o reparo pendente antes de executar DISM/SFC.'};
    await executeAction(step.id,job);
   }
  },persist);
 });
}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  try{
    if(req.headers.host!==`127.0.0.1:${port}`)return send(res,403,{error:'Host não autorizado.'});
    if(req.headers.origin && req.headers.origin!==origin)return send(res,403,{error:'Origem não autorizada.'});
    if(req.headers['sec-fetch-site']==='cross-site')return send(res,403,{error:'Acesso externo não permitido.'});
    const url=new URL(req.url,origin);
    if(req.method==='GET'&&url.pathname==='/api/session')return send(res,200,{csrf,version:'0.1.9',local:true});
    if(url.pathname.startsWith('/api/')&&req.method!=='GET'){
      if(req.headers.origin!==origin||req.headers['x-vimaka-token']!==csrf||!req.headers['content-type']?.startsWith('application/json'))return send(res,403,{error:'Sessão local inválida. Reabra o aplicativo.'});
    }
    if(req.method==='GET'&&url.pathname==='/api/state'){
      return send(res,200,{comparison:await jsonRead(path.join(data,'comparison.json'),{}),storage:await jsonRead(path.join(data,'storage.json'),null),actions,jobs:[...jobs.values()].reverse().slice(0,100)});
    }

    if(req.method==='GET'&&url.pathname==='/api/storage/options'){const info=await getStorageInfo();return send(res,200,{roots:[{id:'profile',label:'Meus arquivos'},...info.roots]});}
    if(req.method==='POST'&&url.pathname==='/api/storage/cancel'){const b=await body(req);const job=jobs.get(b.id);if(!job||job.kind!=='storage'||job.status!=='running')throw Error('Nenhuma análise em execução.');job.cancelRequested=true;return send(res,200,{ok:true});}
    if(req.method==='POST'&&url.pathname==='/api/storage/scan'){
      const b=await body(req),info=await getStorageInfo();const root=b.root==='profile'?os.homedir():info.roots.find(r=>r.id===b.root)?.id;if(!root)throw Error('Selecione uma unidade local válida.');
      return send(res,202,newJob('Analisar espaço',async job=>{job.kind='storage';job.currentStep='Buscando arquivos e pastas';const result=await scanStorage(root,{cancelled:()=>job.cancelRequested,onProgress:p=>{job.storageProgress=p;job.log=p.fileCount+' arquivos · '+p.skipped+' itens ignorados';}});result.programs=info.programs;job.hasWarnings=result.partial;job.currentStep=result.partial?'Análise parcial':'Análise concluída';job.log=result.fileCount+' arquivos · '+result.skipped+' itens ignorados';await fs.writeFile(path.join(data,'storage.json'),JSON.stringify(result));}));
    }
    if(req.method==='POST'&&url.pathname==='/api/scan')return send(res,202,workflow('diagnostic'));
    if(req.method==='POST'&&url.pathname==='/api/workflow'){const b=await body(req);if(b.mode==='performance'&&b.confirm!==true)throw Error('Revise e confirme a ação.');return send(res,202,workflow(b.mode));}
    if(req.method==='POST'&&url.pathname==='/api/action'){
      const b=await body(req),action=safeAction(b.id);if(b.confirm!==true)throw Error('Revise e confirme a ação.');
      return send(res,202,newJob(action.name,async job=>{
        job.currentStep=action.name;job.progress=0;await executeAction(b.id,job);job.progress=100;
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
