import {t,locale} from './i18n.js';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isFinite(v)?v.toLocaleString(locale(),{maximumFractionDigits:1}):'—';
const fields=[['CPU SHA-256 (MiB/s)','cpuSha256MiBs'],['Cópia de memória (MiB/s)','memoryCopyMiBs'],['Gravação de arquivo (MiB/s)','fileWriteMiBs'],['Leitura com cache (MiB/s)','cachedFileReadMiBs']];
export function renderResultsDashboard(state){
 const c=state.comparison||{},r=c.diagnosticReport;
 if(r){
  const issues=r.steps.filter(s=>s.status!=='success').length;
  $('diagnosis-result').innerHTML=`<div class="panel-title"><h2>${t('Resultado do diagnóstico')}</h2><span>${esc(new Date(r.at).toLocaleString(locale()))}</span></div><p>${t(issues?'Diagnóstico com etapas incompletas. Consulte o histórico.':'Diagnóstico concluído. Estas são as medições do seu PC.')}</p><div class="result-grid">${fields.map(([label,key])=>`<article class="metric-card"><span>${t(label)}</span><strong>${number(r.benchmarkAfter?.[key])}</strong></article>`).join('')}</div>`;
 }
 const p=c.performanceReport;
 if(!p)return;
 const a=p.benchmarkBefore,b=p.benchmarkAfter;
 const compatible=a&&b&&a.protocol===b.protocol&&a.runtime===b.runtime;
 const pairs=fields.map(([label,key])=>({label,before:a?.[key],after:b?.[key],delta:compatible&&a[key]>0?(b[key]/a[key]-1)*100:null}));
 $('performance-result').innerHTML=`<div class="panel-title"><h2>${t('Resultado da melhoria: antes e depois')}</h2><span>${esc(new Date(p.at).toLocaleString(locale()))}</span></div><p>${t('Medições da mesma execução no Windows. Barras maiores indicam maior taxa neste microteste.')}</p><div class="result-grid">${pairs.map(x=>{const max=Math.max(x.before||0,x.after||0,1);return `<article class="metric-card"><h3>${t(x.label)}</h3><label>${t('Antes')} <b>${number(x.before)}</b></label><progress class="before-bar" max="${max}" ${Number.isFinite(x.before)?`value="${x.before}"`:'value="0"'}></progress><label>${t('Depois')} <b>${number(x.after)}</b></label><progress max="${max}" ${Number.isFinite(x.after)?`value="${x.after}"`:'value="0"'}></progress><p class="${x.delta>0?'delta-up':x.delta<0?'delta-down':''}">${x.delta==null?t('Comparação indisponível'):`${x.delta>0?'+':''}${number(x.delta)}%`} · ${t('Variação medida')}</p></article>`;}).join('')}</div><div class="result-grid"><article class="metric-card"><span>${t('Memória livre (GB)')}</span><strong>${number(p.before?.freeGB)} → ${number(p.after?.freeGB)}</strong><p>${t('Varia conforme os aplicativos abertos.')}</p></article><article class="metric-card"><span>${t('Entradas de inicialização')}</span><strong>${number(p.before?.startup?.length)} → ${number(p.after?.startup?.length)}</strong></article></div><p>${t('Mudanças de carga e temperatura influenciam os resultados. Valores negativos também são exibidos; não há garantia de aceleração.')}</p><ul>${p.steps.filter(s=>s.status!=='success').map(s=>`<li>${esc(t(s.title))}: ${esc(t(s.detail||s.status))}</li>`).join('')}</ul>`;
}
