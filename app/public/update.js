import {t} from './i18n.js';
export function setupUpdate({api,refresh,notice}){
 const check=document.getElementById('check-update'),download=document.getElementById('download-update'),install=document.getElementById('install-update'),status=document.getElementById('update-status');
 check.onclick=async()=>{check.disabled=true;try{status.textContent=t('Consultando GitHub…');const r=await api('update/check');status.textContent=r.available?`${r.current} → ${r.version} · ${r.name}`:t('Você já está na versão mais recente.');download.hidden=!r.available;}catch(e){status.textContent=e.message;}finally{check.disabled=false;}};
 download.onclick=async()=>{try{await api('update/download',{confirm:true});download.hidden=true;status.textContent=t('Baixando e verificando o instalador…');await refresh();}catch(e){notice(e.message,true);}};
 install.onclick=async()=>{try{await api('update/open',{id:install.dataset.id,confirm:true});status.textContent=t('Conclua a instalação na janela do sistema. Pode ser necessária autorização de administrador.');}catch(e){notice(e.message,true);}};
}
export function renderUpdate(state){
 const job=state.jobs?.find(j=>j.kind==='update');if(!job)return;
 const status=document.getElementById('update-status'),install=document.getElementById('install-update');
 if(job.status==='running')status.textContent=`${t('Baixando e verificando o instalador…')} ${job.progress||0}%`;
 if(job.status==='failed')status.textContent=job.log;
 if(job.status==='success'&&job.update){install.dataset.id=job.update.id;install.hidden=false;}
}
