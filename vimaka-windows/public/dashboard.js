import {t,locale} from './i18n.js';
import {rankScore} from './benchmark-ranking.js';
const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=value=>Number.isFinite(value)?value.toLocaleString(locale(),{maximumFractionDigits:1}):'—';
let currentState={},currentJob;
function download(name,html){const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
export function setupDashboard({api,refresh,confirmAction,notice,showPage}){
 $('optimize').onclick=async()=>{try{
  if(!await confirmAction('Melhorar desempenho','Será feita uma medição antes/depois, diagnóstico de rede, ativação de Alto desempenho, limpeza DNS e verificação/reparo de arquivos. Alto desempenho pode aumentar consumo e calor. Reparos exigem administrador e podem demorar. Com reinício pendente, o reparo será ignorado e sinalizado. Nenhuma tela de configurações será aberta.',true))return;
  await api('workflow',{mode:'performance',confirm:true});showPage('overview');await refresh();
 }catch(error){notice(error.message,true);}};
 $('export-machine').onclick=()=>{
  if(!currentState.comparison?.current)return notice('Execute o diagnóstico primeiro.',true);
  const title=t('Relatório geral da máquina');
  const html=`<!doctype html><html lang="${locale()}"><meta charset="utf-8"><title>${escape(title)}</title><style>body{font:16px/1.6 system-ui;max-width:1100px;margin:32px auto;padding:24px;color:#0f1729}pre{white-space:pre-wrap;overflow-wrap:anywhere}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}table{width:100%}</style><h1>${escape(title)}</h1><p>Vimaka Windows Care · ${escape(new Date().toLocaleString(locale()))}</p><h2>${escape(t('Configuração da máquina'))}</h2>${$('hardware-summary').innerHTML}<h2>${escape(t('Antes e agora'))}</h2>${$('comparison').innerHTML}<h2>${escape(t('Benchmark local'))}</h2>${$('benchmark-results').innerHTML}<p>${escape(t('Microteste local; não representa desempenho geral nem é comparável ao Geekbench.'))}</p><h2>${escape(t('Etapas da execução'))}</h2>${$('execution').innerHTML}<h2>${escape(t('Configuração completa'))}</h2><pre>${escape(JSON.stringify(currentState.comparison.current,null,2))}</pre><p>${escape(t('Relatório local. Revise antes de compartilhar.'))}</p></html>`;
  download('Vimaka-relatorio-geral.html',html);
 };
 $('rank-score').onclick=async()=>{try{
  const refs=await(await fetch('/benchmark-references.json')).json();const ranked=rankScore(Number($('geekbench-score').value),refs.references);
  $('ranking').innerHTML=`<table><thead><tr><th>${t('Posição no grupo')}</th><th>CPU</th><th>Geekbench 7 Single-Core</th></tr></thead><tbody>${ranked.map(row=>`<tr class="${row.local?'your-score':''}"><td>${row.rank}</td><td>${escape(row.local?t(row.name):row.name)}</td><td>${row.score}</td></tr>`).join('')}</tbody></table>`;
  $('ranking-note').textContent=t('Pontuação informada pelo usuário, não verificada. Comparação somente com as referências exibidas.');
 }catch(error){$('ranking-note').textContent=error.message;}};
}
export function renderDashboard(state){
 currentState=state;currentJob=state.jobs?.find(j=>j.status==='running')||state.jobs?.find(j=>j.steps);
 const panel=$('execution');panel.hidden=!currentJob;
 if(currentJob){
  const logOpen=panel.querySelector('details')?.open;
  const job=currentJob,steps=job.steps||[],done=job.status!=='running';
  panel.innerHTML=`<div class="panel-title"><h2>${escape(job.title)}</h2><strong id="elapsed"></strong></div><p>${escape(job.status==='warning'?t('Concluído com avisos'):job.currentStep||job.title)}</p><progress max="100" ${steps.length||done?`value="${steps.length?(job.progress||0):done?100:0}"`:''}></progress><p class="footnote">${t('Progresso por etapas concluídas; não é estimativa de tempo restante.')}</p><ol class="step-list">${steps.map(s=>`<li class="step-${s.status}"><span aria-hidden="true">${({success:'✓',running:'◉',failed:'✕',skipped:'!',pending:'○',interrupted:'!'})[s.status]||'○'}</span><div><strong>${escape(s.title)}</strong> <small>${t(({success:'Concluído',running:'Em execução',failed:'Falhou',skipped:'Não executado',pending:'Aguardando',interrupted:'Interrompido'})[s.status]||s.status)}</small>${s.detail?`<p>${escape(s.detail)}</p>`:''}</div></li>`).join('')}</ol><details><summary>${t('Ver log em execução')}</summary><pre>${escape((job.log||'').slice(-12000))}</pre></details>`;
  if(logOpen)panel.querySelector('details').open=true;
  updateElapsed();
 }
 const machine=state.comparison?.current;
 if(machine){
  const rows=[['Sistema',machine.os],['Modelo',[machine.manufacturer,machine.model].filter(Boolean).join(' ')],['Processador',(machine.cpu||[]).map(x=>x.Name).join(', ')],['Memória instalada',number(machine.totalGB)+' GB'],['GPU',(machine.gpu||[]).map(x=>x.Name).join(', ')],['Discos',(machine.disks||[]).map(x=>`${x.Model} (${number(x.sizeGB)} GB)`).join(', ')],['Reinício pendente',machine.restartPending?'Sim':'Não']];
  $('hardware-summary').innerHTML=`<table>${rows.map(([key,value])=>`<tr><th>${t(key)}</th><td>${escape(value||'—')}</td></tr>`).join('')}</table>`;
  $('hardware-full').textContent=JSON.stringify(machine,null,2);
 }
 const before=state.comparison?.benchmarkBefore,after=state.comparison?.benchmarkAfter;
 if(after){
  const comparable=before?.protocol===after.protocol&&before?.runtime===after.runtime;
  const fields=[['CPU SHA-256 (MiB/s)','cpuSha256MiBs'],['Cópia de memória (MiB/s)','memoryCopyMiBs'],['Gravação de arquivo (MiB/s)','fileWriteMiBs'],['Leitura com cache (MiB/s)','cachedFileReadMiBs']];
  $('benchmark-results').innerHTML=`<table><thead><tr><th>${t('Métrica')}</th><th>${t('Antes')}</th><th>${t('Agora')}</th><th>${t('Variação medida')}</th></tr></thead><tbody>${fields.map(([label,key])=>`<tr><th>${t(label)}</th><td>${number(before?.[key])}</td><td>${number(after[key])}</td><td>${comparable&&before[key]>0?number((after[key]/before[key]-1)*100)+'%':'—'}</td></tr>`).join('')}</tbody></table><p class="footnote">${t('Microteste local; não representa desempenho geral nem é comparável ao Geekbench.')} ${escape(after.protocol)} · ${escape(after.runtime)} · ${escape(after.at)}</p>`;
 }
 $('optimize').disabled=state.jobs?.some(j=>j.status==='running');
}
function updateElapsed(){const label=$('elapsed');if(!label||!currentJob)return;const end=currentJob.finishedAt?Date.parse(currentJob.finishedAt):Date.now();const seconds=Math.max(0,Math.floor((end-Date.parse(currentJob.at))/1000));label.textContent=`${Math.floor(seconds/60)}m ${seconds%60}s`;}
setInterval(updateElapsed,1000);
