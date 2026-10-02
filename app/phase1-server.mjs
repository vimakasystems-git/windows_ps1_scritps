import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {diagnose,symptomRoute} from './diagnosis.mjs';
import {procedures} from './repair-catalog.mjs';
import {RepairEngine,atomicJSON} from './repair-engine.mjs';
import {features,featureAllowed} from './public/plans.js';

export async function createPhase1({data,isWindows,runPS,newJob,jsonRead,licensed,consent,body,send}){
 const diagnosticFile=path.join(data,'diagnosis.json');
 const read=()=>jsonRead(diagnosticFile,null);
 const requireFeature=id=>{if(!featureAllowed(id,licensed()))throw Error('Recurso incluído no pacote completo de R$ 19,99 por computador. Ative a licença.');};
 const requireWindows=()=>{if(!isWindows)throw Error('Estas jornadas utilizam fontes do Windows. O inventário portátil continua disponível.');};
 async function collect({extended=false,probeNetwork=false}={},onProgress=()=>{}){
  const file=path.join(data,crypto.randomUUID()+'.evidence.json');
  const timer=setInterval(async()=>{const progress=await jsonRead(file+'.progress.json',null);if(progress)onProgress(progress);},500);
  try{await runPS('Collect-Evidence.ps1',['-ResultFile',file,'-WindowHours',extended?'168':'72',...(probeNetwork?['-ProbeNetwork']:[])],undefined,180000);
   const raw=await jsonRead(file,null);if(!raw?.at)throw Error('Coleta não produziu evidências válidas.');
   const diagnosis=diagnose(raw,{extended});await atomicJSON(diagnosticFile,diagnosis);return diagnosis;
  }finally{clearInterval(timer);await fs.unlink(file).catch(()=>{});await fs.unlink(file+'.progress.json').catch(()=>{});}
 }
 async function native(op,onExecuting){
  const requestFile=path.join(data,op.id+'.request.json'),resultFile=path.join(data,op.id+'.procedure.json');
  await atomicJSON(requestFile,{id:op.id,action:op.action,params:op.params});
  let failure;
  try{
   await onExecuting?.();
   try{await runPS('Repair-Procedure.ps1',['-RequestFile',requestFile,'-ResultFile',resultFile,'-DataDirectory',data],undefined,3600000);}catch(e){failure=e;}
   const result=await jsonRead(resultFile,null);
   if(!result?.ok||failure){const error=Error(result?.error||failure?.message||'Nenhum resultado recebido. Não repita antes de revisar a recuperação.');error.beforeExecution=result?.phase==='preparing';throw error;}
   return result;
  }finally{await fs.unlink(requestFile).catch(()=>{});await fs.unlink(resultFile).catch(()=>{});}
 }
 const engine=await new RepairEngine({folder:path.join(data,'repair-journal'),execute:async(op,onExecuting)=>{
  if(op.action==='networkRetest'){await onExecuting();const diagnosis=await collect({probeNetwork:true});return {validated:false,diagnosisId:diagnosis.id,detail:'Amostras registradas. Compare o sintoma; falha ICMP isolada não comprova falha de internet.'};}
  const result=await native(op,onExecuting);
  if(result.integrity){const previous=await read();if(previous){previous.raw.integrity=result.integrity;previous.raw.restartPending=result.restartRequired;await atomicJSON(diagnosticFile,diagnose(previous.raw,{extended:previous.mode==='extended'}));}}
  return result;
 }}).init();
 function guardMutation(){if(engine.busy||engine.list().some(o=>o.state==='recovery_needed'))throw Error('Há um procedimento ativo ou interrompido. Revise o diário de reparos antes de outra alteração.');}
 async function visibleDiagnosis(){const diagnosis=await read();if(!diagnosis)return null;if(!featureAllowed('extendedTimeline',licensed())){diagnosis.timeline=[];diagnosis.raw.events={status:'unavailable',reason:'Eventos detalhados disponíveis na linha do tempo ampliada.'};}return diagnosis;}
 async function state(){return {entitlements:{features,paid:!!licensed()},diagnosis:await visibleDiagnosis(),repairOperations:engine.list(),procedures};}
 async function handle(req,res,url){
  if(req.method==='GET'&&url.pathname==='/api/diagnosis'){send(res,200,await visibleDiagnosis());return true;}
  const route=url.pathname.slice(5);
  if(req.method!=='POST'||!['diagnosis/collect','symptoms','repairs/propose','repairs/run','repairs/cancel','repairs/review'].includes(route))return false;
  consent();const b=await body(req);
  if(route==='symptoms'){send(res,200,symptomRoute(b.text));return true;}
  requireWindows();
  if(route==='diagnosis/collect'){
   if(b.extended===true)requireFeature('extendedTimeline');
   if(b.probeNetwork===true&&b.networkConsent!==true)throw Error('Autorize explicitamente DNS e pings antes do teste externo.');
   send(res,202,newJob('Diagnóstico por problema',async job=>{
    job.steps=Object.entries({os:'Sistema e manutenção pendente',startup:'Entradas de inicialização',boot:'Medições de inicialização',events:'Eventos e falhas de aplicativos',services:'Serviços de atualização',performance:'Amostras de CPU, memória e disco',network:'Contexto e testes autorizados de rede',rules:'Relacionar evidências às cinco jornadas'}).map(([id,title])=>({id,title,status:'pending'}));job.progress=0;
    try{const diagnosis=await collect({extended:b.extended===true,probeNetwork:b.probeNetwork===true},p=>{const index=job.steps.findIndex(s=>s.id===p.id);if(index>=0){job.steps.forEach((s,i)=>s.status=i<index?'success':i===index?'running':'pending');job.progress=Math.round(index/job.steps.length*100);job.currentStep=job.steps[index].title;}});job.steps.forEach(s=>{s.status=diagnosis.raw[s.id]?.status==='unavailable'?'skipped':'success';if(s.status==='skipped')s.detail='Fonte indisponível; não indica defeito.';});job.progress=100;job.currentStep='Evidências coletadas';job.log=diagnosis.findings.length+' achados. Revise evidências, hipóteses e limitações.';job.hasWarnings=job.steps.some(s=>s.status==='skipped');}
    catch(e){job.steps.forEach(s=>{if(s.status==='running')s.status='failed';else if(s.status==='pending')s.status='skipped';});throw e;}
   }));return true;
  }
  if(route==='repairs/propose'){const op=await engine.propose(b.action,b.params||{},await read());requireFeature(procedures[op.action].feature);send(res,200,{operation:op,procedure:procedures[op.action]});return true;}
  if(route==='repairs/cancel'){send(res,200,await engine.cancel(b.id));return true;}
  if(route==='repairs/run'){
   const op=engine.operations.get(b.id);if(!op)throw Error('Proposta não encontrada.');requireFeature(procedures[op.action].feature);
   if(b.confirm!==true)throw Error('Confirme o procedimento específico.');
   send(res,202,newJob(procedures[op.action].title,async job=>{
    job.steps=[{id:'preparing',title:'Validar solicitação e elegibilidade',status:'pending'},{id:'executing',title:'Pré-condições, backup e procedimento selecionado',status:'pending'},{id:'validating',title:'Verificar pós-condições',status:'pending'}];
    const result=await engine.run(b.id,b,await read(),async current=>{
     const states=['preparing','executing','validating'];const index=states.indexOf(current.state);
     if(index>=0){job.steps.forEach((s,i)=>s.status=i<index?'success':i===index?'running':'pending');job.progress=Math.round(index/3*100);}
     job.currentStep=current.transitions.at(-1).note;
    }).catch(e=>{for(const s of job.steps)if(s.status==='running')s.status='failed';else if(s.status==='pending')s.status='skipped';throw e;});
    job.hasWarnings=!['completed','reverted'].includes(result.state);job.steps.forEach(s=>s.status='success');if(job.hasWarnings){job.steps[2].status='skipped';job.steps[2].detail='Pós-condição ou sintoma ainda pendente de confirmação.';}
    job.progress=100;job.log=JSON.stringify(result.result,null,2);
   }));return true;
  }
  if(route==='repairs/review'){
   if(engine.busy||b.confirm!==true)throw Error('Aguarde o procedimento terminar e confirme a revisão.');
   const check=await native({id:crypto.randomUUID(),action:'lockCheck',params:{}});
   const op=engine.operations.get(b.id);
   if(op?.state==='awaiting_restart'&&b.resolved===true&&(check.restartRequired||!check.bootAt||Date.parse(check.bootAt)<=Date.parse(op.at)))throw Error('O Windows ainda não reiniciou após a operação ou há manutenção pendente. Reinicie e revalide.');
   send(res,200,await engine.recordHumanValidation(b.id,b.resolved,b.note,check.lockFree));return true;
  }
  return false;
 }
 return {state,handle,guardMutation,requireFeature};
}
