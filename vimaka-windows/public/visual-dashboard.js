import {t,locale} from './i18n.js';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number(x).toLocaleString(locale(),{maximumFractionDigits:1});
const size=x=>x==null?t('Não informado'):x>=1073741824?num(x/1073741824)+' GB':x>=1048576?num(x/1048576)+' MB':num(x/1024)+' KB';
let current={},job;
export function setupVisual({api,refresh,notice}){
 api('storage/options').then(info=>{$('storage-root').innerHTML=info.roots.map(r=>`<option value="${esc(r.id)}">${esc(t(r.label))}</option>`).join('');}).catch(e=>notice(e.message,true));
 $('storage-scan').onclick=async()=>{try{await api('storage/scan',{root:$('storage-root').value});await refresh();}catch(e){notice(e.message,true);}};
 $('storage-cancel').onclick=async()=>{try{await api('storage/cancel',{id:job.id});await refresh();}catch(e){notice(e.message,true);}};
 $('storage-filter').oninput=()=>renderResults();
}
export function renderVisual(state){
 const profile=$('storage-root').querySelector('option[value=profile]');if(profile)profile.textContent=t('Meus arquivos');
 const m=state.comparison?.current;
 if(m){
  const drives=(m.drives||[]).filter(d=>d.totalGB>=4),low=drives.some(d=>d.freeGB<15);
  const status=m.restartPending?'Reinício pendente':low?'Pouco espaço disponível':'Diagnóstico disponível';
  $('health-title').textContent=t(status);
  $('health-copy').textContent=t(m.restartPending?'Salve seu trabalho e reinicie o Windows para concluir as alterações pendentes.':low?'Veja o que ocupa espaço antes de escolher o que remover.':'Veja os dados do seu computador e escolha o próximo cuidado.');
  $('health-icon').textContent=m.restartPending||low?'!':'✓';
  $('health-card').classList.toggle('attention',!!m.restartPending||low);
  $('last-reading').textContent=t('Última leitura')+': '+new Date(m.at).toLocaleString(locale());
  $('visual-metrics').innerHTML=`<article class="metric-card"><span>${t('Memória em uso')}</span><strong>${num(m.totalGB-m.freeGB)} <small>/ ${num(m.totalGB)} GB</small></strong><progress max="${m.totalGB}" value="${m.totalGB-m.freeGB}"></progress><p>${t('Varia conforme os aplicativos abertos.')}</p></article><article class="metric-card"><span>${t('Ao ligar o computador')}</span><strong>${m.startup?.length||0} <small>${t('aplicativos')}</small></strong><p>${t('Revise a inicialização nas ferramentas.')}</p></article><article class="metric-card"><span>${t('Seu computador')}</span><strong class="model-name">${esc(m.model)}</strong><p>${esc(m.os)}</p></article>`;
  $('drive-cards').innerHTML=drives.map(d=>`<article class="drive-card"><div><strong>${esc(d.name)}</strong><span>${num(d.freeGB)} GB ${t('livres')}</span></div><progress max="${d.totalGB}" value="${d.totalGB-d.freeGB}"></progress><p>${num(d.totalGB-d.freeGB)} / ${num(d.totalGB)} GB ${t('utilizados')}</p></article>`).join('')||t('Nenhuma unidade disponível.');
 }
 current=state.storage;job=state.jobs?.find(j=>j.kind==='storage'&&j.status==='running');
 $('storage-scan').disabled=state.jobs?.some(j=>j.status==='running');$('storage-cancel').hidden=!job;
 $('storage-progress').hidden=!job;
 $('storage-status').textContent=job?(t(job.cancelRequested?'Interrompendo…':'Buscando arquivos e pastas')+' · '+(job.storageProgress?.fileCount||0)+' '+t('arquivos encontrados')):current?`${t(current.partial?'Análise parcial':'Análise concluída')} · ${current.fileCount} ${t('arquivos encontrados')} · ${current.skipped} ${t('itens ignorados')} · ${new Date(current.at).toLocaleString(locale())}`:t('Escolha onde procurar e inicie a análise.');
 renderResults();
}
function renderResults(){
 if(!current)return;
 const query=$('storage-filter').value.toLocaleLowerCase();
 $('storage-summary').textContent=current.root+' · '+size(current.bytes)+' · '+t('Tamanho lógico dos arquivos encontrados. Pastas se sobrepõem; não some seus tamanhos.');
 $('storage-partial').hidden=!current.partial;
 const render=(id,items,apps=false)=>{
  const filtered=items.filter(x=>(x.path||x.name).toLocaleLowerCase().includes(query));
  const max=Math.max(1,...items.map(x=>x.bytes||0));
  $(id).innerHTML=filtered.slice(0,50).map((x,i)=>`<li><div class="space-row"><span class="space-rank">${i+1}</span><div><strong translate="no">${esc(x.name||x.path.split(/[\\/]/).pop())}</strong><p translate="no">${esc(x.path||x.version||'')}</p></div><b>${size(x.bytes)}</b></div>${x.bytes?`<progress aria-label="${esc(x.name||x.path)}" max="${max}" value="${x.bytes}"></progress>`:''}</li>`).join('')||`<li>${t('Nenhum resultado nesta lista.')}</li>`;
 };
 render('large-files',current.files);render('large-folders',current.folders);render('large-programs',current.programs||[],true);
}
