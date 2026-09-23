import {setupVisual,renderVisual} from './visual-dashboard.js';
import {setupDashboard,renderDashboard} from './dashboard.js';
import {t,locale,translatePage} from './i18n.js';
import './donation.js';
const $=id=>document.getElementById(id);
let csrf='',state={},installPrompt=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=n=>Number.isFinite(Number(n))?Number(n).toLocaleString(locale(),{maximumFractionDigits:2}):'Não medido';
function notice(text,error=false){$('notice').textContent=text;$('notice').classList.toggle('error',error);}
async function api(route,data){const r=await fetch('/api/'+route,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','X-Vimaka-Token':csrf},body:JSON.stringify(data)});const value=await r.json();if(!r.ok)throw Error(value.error||'Falha de conexão');return value;}
const pageNames={space:'Espaço em disco',overview:'Visão geral',tools:'Diagnóstico e reparos',cerebro:'Cérebro Brasil',ecosystem:'Ecossistema Vimaka',history:'Histórico',donation:'Apoie o desenvolvedor'};
function showPage(name){if(!Object.hasOwn(pageNames,name))name='overview';document.querySelectorAll('.page').forEach(x=>x.hidden=x.id!==name);document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===name));$('breadcrumb').textContent='Meu computador / '+pageNames[name];location.hash=name;}
document.querySelectorAll('[data-page],[data-go]').forEach(b=>b.onclick=()=>showPage(b.dataset.page||b.dataset.go));
function confirmAction(title,detail,admin=false){$('confirm-title').textContent=title;$('confirm-detail').textContent=detail;$('confirm-admin').textContent=admin?'Esta ação exige administrador. O Windows solicitará autorização ou login de uma conta administradora. Se você não possui essas credenciais, cancele e procure o administrador da máquina.':'A execução ficará registrada no histórico local.';const d=$('confirm');d.returnValue='cancel';d.showModal();return new Promise(resolve=>d.addEventListener('close',()=>resolve(d.returnValue==='ok'),{once:true}));}
function render(){
 renderDashboard(state);renderVisual(state);
 const before=state.comparison?.before,current=state.comparison?.current;
 if(current){
  $('stats').innerHTML=[['INICIALIZAÇÃO',`${current.startup.length} entradas`,'Programas registrados para iniciar com o Windows'],['MEMÓRIA LIVRE',`${format(current.freeGB)} GB`,`de ${format(current.totalGB)} GB · varia com os aplicativos abertos`],['FERRAMENTAS',Object.keys(state.actions||{}).length,'Diagnóstico e reparos disponíveis neste aplicativo']].map(([a,b,c])=>`<article class="stat"><small>${a}</small><strong>${esc(b)}</strong><p>${esc(c)}</p></article>`).join('');
  const rows=[['Entradas de inicialização',before?.startup?.length,current.startup.length],['Memória livre (GB)',format(before?.freeGB),format(current.freeGB)],['Serviços Remojo',before?.remojo??'Não medido',current.remojo],['Plano de energia',before?.power||'Não registrado',current.power||'Não registrado']];
  $('comparison').innerHTML=`<table><thead><tr><th>INDICADOR</th><th>ANTES</th><th>AGORA</th></tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="footnote">Referência: ${esc(before?.at)}<br>Leitura atual: ${esc(current.at)}</p>${state.comparison?.notes?`<p class="footnote" translate="no">${esc(state.comparison.notes)}</p>`:''}`;
  const low=(current.drives||[]).filter(d=>d.totalGB>=4&&d.freeGB<15);
  const ethernet=(current.network||[]).find(n=>n.Name==='Ethernet'&&n.Status==='Up');
  $('findings').innerHTML=[['Espaço em disco',low.length?low.map(d=>`${d.name} com ${d.freeGB} GB livres`).join('; '):'Unidades com 4 GB ou mais: nenhuma abaixo de 15 GB livres. Partições menores ficam fora deste alerta.'],['Conexão de rede',ethernet?`Ethernet negociada em ${ethernet.LinkSpeed}. Confira cabo e porta se a velocidade esperada for maior.`:'Consulte o diagnóstico de rede para verificar os adaptadores.'],['Referência honesta','A comparação registra configurações e leituras. Não há medição controlada de aceleração.']].map(([t,d])=>`<div class="finding"><strong>${esc(t)}</strong><p>${esc(d)}</p></div>`).join('');
 }
 $('tools-grid').innerHTML=Object.entries(state.actions||{}).map(([id,a])=>`<article class="card"><span class="tag">${a.manual?'Janela de configuração':a.admin?'Administrador':'Ferramenta local'}</span><h3>${esc(a.name)}</h3><p>${esc(a.detail)}</p><button data-action="${id}">Ver ação →</button></article>`).join('');
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
 const labels={running:'Em execução',success:'Concluído',failed:'Falhou',interrupted:'Interrompido',warning:'Concluído com avisos'};
 $('jobs').innerHTML=state.jobs?.length?state.jobs.map(j=>`<details class="job ${esc(j.status)}" ${j.status==='running'?'open':''}><summary><strong>${esc(j.title)}</strong><small>${esc(labels[j.status])} · ${esc(new Date(j.at).toLocaleString(locale()))}</small></summary><pre>${esc(j.log||'Aguardando resultado…')}</pre></details>`).join(''):'<article class="panel"><h2>Nenhuma ação executada</h2><p>Os resultados aparecerão aqui quando você usar uma ferramenta.</p></article>';
 $('scan').disabled=state.jobs?.some(j=>j.status==='running');
}
async function refresh(){try{state=await api('state');$('connection').textContent='Conectado a este PC';render();}catch(e){$('connection').textContent='Componente local desconectado';notice('Abra o executável Vimaka Windows Care para reconectar. '+e.message,true);}}
async function action(id){try{const a=state.actions[id];if(await confirmAction(a.name,a.detail+(a.manual?' A janela criada pelo app será fechada após 10 segundos, quando identificável. Janelas já abertas serão preservadas.':''),a.admin)){await api('action',{id,confirm:true});notice('Ação iniciada. Acompanhe o histórico.');showPage('history');await refresh();}}catch(e){notice(e.message,true);}}
$('scan').onclick=async()=>{try{await api('scan',{});notice('Lendo o estado do computador…');await refresh();}catch(e){notice(e.message,true);}};
$('export').onclick=()=>{const c=state.comparison||{};if(!c.current)return notice('Atualize o diagnóstico primeiro.',true);const html=`<!doctype html><html lang="${locale()}"><meta charset="utf-8"><title>${t("Vimaka · Antes e depois")}</title><style>body{font:16px/1.6 system-ui;max-width:900px;margin:50px auto;color:#0f1729;padding:20px}table{width:100%;border-collapse:collapse}td,th{padding:15px;border-bottom:1px solid #ddd;text-align:left}h1{font-size:36px}</style><h1>${t("Vimaka · Antes e depois")}</h1>${$('comparison').innerHTML}<p>${t("Leituras em momentos diferentes não constituem benchmark. Não é possível afirmar aumento de velocidade com estes dados.")}</p><p>${t("Relatório local. Revise antes de compartilhar.")}</p></html>`;const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));const a=document.createElement('a');a.href=url;a.download='Vimaka-antes-e-depois.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('open-cerebro').onclick=async()=>{try{await api('open-cerebro',{});notice('Cérebro Brasil aberto em uma janela própria.');}catch(e){notice(e.message,true);}};
$('shutdown').onclick=async()=>{try{if(await confirmAction('Encerrar componente local','Conclua as operações em andamento. Para voltar, abra o atalho Vimaka Windows Care.')){await api('shutdown',{confirm:true});notice('Componente encerrado. Abra o atalho para reconectar.');$('connection').textContent='Desconectado';}}catch(e){notice(e.message,true);}};
let solutions=[];
function ecosystem(){const q=$('search').value.toLocaleLowerCase();$('ecosystem-grid').innerHTML=solutions.filter(s=>(s.name+' '+s.category+' '+t(s.category)).toLocaleLowerCase().includes(q)).map(s=>`<article class="card"><span class="tag">${esc(s.category)}</span><h3>${esc(s.name)}</h3><p>${esc(new URL(s.url).hostname)}</p><a class="button" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">Abrir solução ↗</a></article>`).join('');}
$('search').oninput=ecosystem;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else notice('No Edge ou Chrome, abra o menu do navegador e escolha “Instalar este site como aplicativo”. O executável também abre a interface em janela de app.');};
window.addEventListener('hashchange',()=>showPage(location.hash.slice(1)||'overview'));
async function boot(){try{csrf=(await api('session')).csrf;solutions=await(await fetch('/solutions.json')).json();ecosystem();await refresh();showPage(location.hash.slice(1)||'overview');if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});setInterval(()=>{refresh();},2500);}catch(e){notice(e.message,true);}}
boot();
if(document.modelContext?.registerTool){document.modelContext.registerTool({name:'read_windows_comparison',description:'Lê a comparação local já exibida, sem iniciar diagnósticos ou alterações.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:input=>{if(!input||Array.isArray(input)||Object.keys(input).length)throw Error('Esta consulta não aceita parâmetros.');return {comparison:state.comparison||{},connected:!!csrf};}});}

document.addEventListener('languagechange',()=>{render();ecosystem();showPage(location.hash.slice(1)||'overview');translatePage();});
setupVisual({api,refresh,notice});
setupDashboard({api,refresh,confirmAction,notice,showPage});