export const plans={
 benchmark:[['benchmark','Medir desempenho local'],['report','Gerar dashboard e relatório']],
 diagnostic:[['inventory','Coletar configuração'],['network','Diagnosticar rede'],['benchmark','Medir desempenho local'],['report','Gerar dashboard e relatório']],
 performance:[['before','Registrar antes'],['benchmarkBefore','Medir desempenho antes'],['network','Diagnosticar rede'],['energy','Ativar Alto desempenho'],['dns','Limpar cache DNS'],['health','Verificar integridade'],['repair','Reparar arquivos do Windows'],['after','Registrar depois'],['benchmarkAfter','Medir desempenho depois'],['report','Gerar comparação']]
};
export function makeSteps(mode){if(!Object.hasOwn(plans,mode))throw Error('Fluxo não permitido.');return plans[mode].map(([id,title])=>({id,title,status:'pending'}));}
export async function executeSteps(job,execute,persist=async()=>{}){
 for(const step of job.steps){step.status='running';step.startedAt=new Date().toISOString();job.currentStep=step.title;await persist();
  try{const outcome=await execute(step);step.status=outcome?.skip?'skipped':'success';step.detail=outcome?.detail||'';}
  catch(error){step.status='failed';step.detail=error.message;}
  step.finishedAt=new Date().toISOString();job.progress=Math.round(100*job.steps.filter(s=>['success','failed','skipped'].includes(s.status)).length/job.steps.length);await persist();
 }
 job.hasWarnings=job.steps.some(s=>s.status==='failed'||s.status==='skipped');job.currentStep='Concluído';
}
