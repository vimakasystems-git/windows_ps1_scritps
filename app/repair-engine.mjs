import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {procedures,validateProposal} from './repair-catalog.mjs';
export async function atomicJSON(file,value){const tmp=file+'.'+crypto.randomUUID()+'.tmp';try{await fs.writeFile(tmp,JSON.stringify(value,null,2),{flag:'wx'});await fs.rename(tmp,file);}catch(e){await fs.unlink(tmp).catch(()=>{});throw e;}}
const terminal=new Set(['completed','failed','cancelled','reverted']);
export class RepairEngine{
 constructor({folder,execute}){this.folder=folder;this.execute=execute;this.operations=new Map();this.busy=false;}
 async init(){await fs.mkdir(this.folder,{recursive:true});for(const file of await fs.readdir(this.folder)){if(!/^[a-f0-9-]{36}\.json$/.test(file))continue;let op;try{op=JSON.parse(await fs.readFile(path.join(this.folder,file),'utf8'));}catch{throw Error('Diário de reparos ilegível. Preserve os arquivos e solicite recuperação.');}this.operations.set(op.id,op);if(['authorized','preparing','executing','validating'].includes(op.state)){await this.transition(op,['executing','validating'].includes(op.state)?'recovery_needed':'failed','Aplicativo interrompido. Nenhuma repetição automática.');}}return this;}
 list(){return [...this.operations.values()].sort((a,b)=>b.at.localeCompare(a.at));}
 async transition(op,state,note){op.state=state;op.updatedAt=new Date().toISOString();op.transitions.push({state,at:op.updatedAt,note});await atomicJSON(path.join(this.folder,op.id+'.json'),op);}
 async propose(action,params,diagnosis){validateProposal(action,params,diagnosis);if(action==='startupRestore'){const source=this.operations.get(params.sourceId);if(!source||source.action!=='startupDisable'||!['completed','awaiting_verification','awaiting_restart','recovery_needed'].includes(source.state))throw Error('Operação de origem não possui backup elegível.');}
 const op={id:crypto.randomUUID(),action,procedureVersion:procedures[action].version,params,diagnosisId:diagnosis?.id,at:new Date().toISOString(),state:'proposed',transitions:[],evidence:diagnosis?.findings.filter(f=>f.actions.includes(action)).map(f=>({id:f.id,evidence:f.evidence}))||[]};await this.transition(op,'proposed','Revise impacto, backup e limitações antes de autorizar.');this.operations.set(op.id,op);return op;}
 async cancel(id){const op=this.operations.get(id);if(!op)throw Error('Operação inexistente.');if(op.state!=='proposed')throw Error('Somente propostas ainda não autorizadas podem ser canceladas; não interrompa manutenção em execução.');await this.transition(op,'cancelled','Cancelado antes de qualquer execução.');return op;}
 async run(id,authorization,diagnosis,onChange=async()=>{}){
 const op=this.operations.get(id);if(!op||op.state!=='proposed')throw Error('A proposta não está disponível para execução.');
 if(authorization?.confirm!==true)throw Error('Confirme a operação.');if(op.action==='integrityRepair'&&authorization.backupConfirmed!==true)throw Error('Confirme o backup pessoal externo antes do reparo sem reversão automática.');
 if(this.busy)throw Error('Já existe procedimento em execução.');
 if(this.list().some(x=>x.state==='recovery_needed')&&op.action!=='startupRestore')throw Error('Revise a operação interrompida e confirme a verificação antes de iniciar outra.');
 validateProposal(op.action,op.params,diagnosis);if(op.action!=='startupRestore'&&op.diagnosisId!==diagnosis.id)throw Error('O diagnóstico mudou. Revise uma nova proposta.');
 this.busy=true;let started=false;
 const progress=async(state,note)=>{await this.transition(op,state,note);await onChange(op);};
 try{op.authorization={at:new Date().toISOString(),confirm:true,backupConfirmed:authorization.backupConfirmed===true};await progress('authorized','Autorização específica registrada.');await progress('preparing','Verificando pré-condições e backup aplicável.');const result=await this.execute(op,async()=>{started=true;await progress('executing','Procedimento oficial em execução.');});await progress('validating','Verificando pós-condições e limitações.');op.result=result;
  if(result.restartRequired)await progress('awaiting_restart','Reinício necessário. Salve seu trabalho e reinicie pelo Windows; depois revalide.');
  else if(result.validated===true)await progress(op.action==='startupRestore'?'reverted':'completed',result.detail||'Pós-condição específica confirmada.');
  else await progress('awaiting_verification',result.detail||'Execução encerrada; sintoma ainda precisa de verificação.');
  if(op.state==='reverted'){const source=this.operations.get(op.params.sourceId);source.restoredBy=op.id;await this.transition(source,'reverted','Backup restaurado e pós-condição conferida pela operação '+op.id);}
  return op;
 }catch(error){await progress(started&&!error.beforeExecution?'recovery_needed':'failed',error.message);throw error;}finally{this.busy=false;}
 }
 async recordHumanValidation(id,resolved,note,lockFree){const op=this.operations.get(id);if(!op||!['awaiting_verification','awaiting_restart','recovery_needed','completed','reverted'].includes(op.state))throw Error('Operação não está aguardando revisão.');if(typeof resolved!=='boolean'||typeof note!=='string'||note.trim().length<5||note.length>500)throw Error('Descreva como reproduziu o teste (5 a 500 caracteres).');if(op.state==='recovery_needed'&&!lockFree)throw Error('Confirme primeiro que nenhum procedimento nativo continua em execução.');op.humanValidation={resolved,note:note.trim(),at:new Date().toISOString(),source:'declaração do usuário, não verificação automática'};await this.transition(op,resolved?'completed':'awaiting_verification','Resultado humano registrado; evidência automática preservada.');return op;}
}
