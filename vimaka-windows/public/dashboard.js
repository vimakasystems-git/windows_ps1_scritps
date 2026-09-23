import {t,locale} from './i18n.js';
import {rankScore} from './benchmark-ranking.js';
const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=value=>Number.isFinite(value)?value.toLocaleString(locale(),{maximumFractionDigits:1}):'—';
let currentState={},currentJob;
let references,rankingScore=null;
async function showRanking(score){
 references??=await(await fetch('/benchmark-references.json')).json();
 rankingScore=score||null;
 const ranked=score?rankScore(score,references.references):references.references.map((x,i)=>({...x,rank:i+1}));
 $('ranking').innerHTML=`<ol class="space-list">${ranked.map(row=>`<li class="${row.local?'your-score':''}"><div class="space-row"><span>${row.rank}</span><strong>${escape(row.local?t(row.name):row.name)}</strong><b>${row.score}</b></div><progress max="${Math.max(...ranked.map(r=>r.score))}" value="${row.score}" aria-label="${escape(row.name)}"></progress></li>`).join('')}</ol>`;
 $('ranking-note').textContent=t(score?'Pontuação informada pelo usuário, não verificada. Comparação somente com as referências exibidas.':'Informe seu resultado Geekbench para incluir seu PC nesta comparação.');
}
function download(name,html){const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
export function setupDashboard({api,refresh,confirmAction,notice,showPage}){
 $('run-benchmark').onclick=async()=>{try{await api('workflow',{mode:'benchmark'});await refresh();}catch(e){notice(e.message,true);}};
 let saved;try{saved=Number(localStorage.getItem('vimaka-geekbench7-single'));}catch{}
 if(saved>0)$('geekbench-score').value=saved;showRanking(saved>0?saved:null).catch(e=>notice(e.message,true));
 $('clear-score').onclick=()=>{try{localStorage.removeItem('vimaka-geekbench7-single');}catch{}$('geekbench-score').value='';showRanking(null).catch(e=>notice(e.message,true));};
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
 $('rank-score').onclick=async()=>{try{const score=Number($('geekbench-score').value);rankScore(score,[]);await showRanking(score);try{localStorage.setItem('vimaka-geekbench7-single',String(score));}catch{}}catch(error){$('ranking-note').textContent=t(error.message);}};
}
export function renderDashboard(state){
 const bench=state.jobs?.find(j=>j.mode==='benchmark');const busy=state.jobs?.some(j=>j.status==='running');
 $('run-benchmark').disabled=busy;
 $('benchmark-progress').hidden=bench?.status!=='running';
 $('benchmark-status').textContent=bench?t(({running:'Medindo desempenho…',success:'Benchmark concluído',warning:'Concluído com avisos',failed:'Falhou',interrupted:'Interrompido'})[bench.status])+' · '+new Date(bench.at).toLocaleString(locale()):t('Pronto para medir.');
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
  $('benchmark-cards').innerHTML=fields.slice(0,3).map(([label,key])=>`<article class="metric-card"><span>${t(label)}</span><strong>${number(after[key])}</strong><p>${t('Última medição local')}</p></article>`).join('');
  $('benchmark-results').innerHTML=`<table><thead><tr><th>${t('Métrica')}</th><th>${t('Antes')}</th><th>${t('Agora')}</th><th>${t('Variação medida')}</th></tr></thead><tbody>${fields.map(([label,key])=>`<tr><th>${t(label)}</th><td>${number(before?.[key])}</td><td>${number(after[key])}</td><td>${comparable&&before[key]>0?number((after[key]/before[key]-1)*100)+'%':'—'}</td></tr>`).join('')}</tbody></table><p class="footnote">${t('Microteste local; não representa desempenho geral nem é comparável ao Geekbench.')} ${escape(after.protocol)} · ${escape(after.runtime)} · ${escape(after.at)}</p>`;
 }
 $('optimize').disabled=state.jobs?.some(j=>j.status==='running');
}
function updateElapsed(){const label=$('elapsed');if(!label||!currentJob)return;const end=currentJob.finishedAt?Date.parse(currentJob.finishedAt):Date.now();const seconds=Math.max(0,Math.floor((end-Date.parse(currentJob.at))/1000));label.textContent=`${Math.floor(seconds/60)}m ${seconds%60}s`;}
setInterval(updateElapsed,1000);
