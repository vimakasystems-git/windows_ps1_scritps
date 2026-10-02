const $=id=>document.getElementById(id);let api,notice,busy=false,fingerprint='';
export function setupDrivers(deps){({api,notice}=deps);
 $('drivers-scan').onclick=()=>run('drivers/scan',{confirm:$('drivers-online-consent').checked},'Diagnóstico de drivers iniciado.');
 $('drivers-download').onclick=()=>run('drivers/download',{confirm:true,compatible:$('drivers-compatible').checked,deviceId:$('drivers-device').value,vendor:$('drivers-vendor').value,url:$('drivers-url').value},'Baixando e verificando o pacote oficial.');
 $('drivers-install').onclick=()=>{if(!$('drivers-install-consent').checked)return notice('Autorize a execução do instalador oficial.',true);run('drivers/install',{id:$('drivers-package').value,confirm:true},'Assistente oficial solicitado. Confirme a instalação no Windows.');};
 $('drivers-configure').onclick=()=>{if(!$('drivers-install-consent').checked)return notice('Autorize abrir a configuração de dispositivos.',true);run('drivers/configure',{confirm:true},'Configuração de dispositivos solicitada.');};
}
async function run(route,data,message){try{await api(route,data);notice(message);}catch(e){notice(e.message,true);}}
function option(select,value,text){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}
export async function renderDrivers(state){
 if(!api||busy)return;busy=true;
 try{if(state.platform!=='win32'){$('drivers-summary').textContent='Serviço de drivers disponível no Windows.';return;}
 const value=await api('drivers/state'),scan=value.scan;
 const next=(scan?.at||'')+JSON.stringify(value.packages.map(p=>p.id));if(next===fingerprint)return;fingerprint=next;
 $('drivers-sources').replaceChildren();$('drivers-vendor').replaceChildren();
 for(const [id,v] of Object.entries(value.manufacturers)){option($('drivers-vendor'),id,v.name);const a=document.createElement('a');a.href=v.portal;a.textContent=v.name+' — site oficial';a.target='_blank';a.rel='noopener noreferrer';$('drivers-sources').append(a,document.createTextNode(' · '));}
 $('drivers-device').replaceChildren();for(const d of scan?.devices||[])option($('drivers-device'),d.DeviceID,(d.DeviceName||d.DeviceID)+' · '+(d.DriverVersion||'versão indisponível'));
 $('drivers-package').replaceChildren();for(const p of value.packages)option($('drivers-package'),p.id,p.deviceName+' · '+p.vendor+' · assinatura conferida');
 $('drivers-summary').textContent=scan?`${scan.devices.length} drivers inventariados; ${scan.problems.length} dispositivos com falhas; ${scan.offeredUpdates.length} ofertas de atualização. Consulta: ${scan.updateSearch==='complete'?'concluída':scan.updateSearch==='partial'?'parcial':'indisponível'}.`:'Execute o diagnóstico para verificar versões e ofertas de atualização.';
 $('drivers-inventory').textContent=JSON.stringify(scan?.devices||[],null,2);$('drivers-results').replaceChildren();
 for(const p of scan?.problems||[]){const line=document.createElement('p');line.textContent='Falha: '+p.Name+' · código '+p.ConfigManagerErrorCode;$('drivers-results').append(line);}
 for(const u of scan?.offeredUpdates||[]){const line=document.createElement('p');line.textContent='Atualização oferecida: '+u.title+' · '+u.manufacturer+' · ID '+u.hardwareId;$('drivers-results').append(line);}
 for(const text of scan?.limitations||[]){const line=document.createElement('p');line.textContent=text;$('drivers-results').append(line);}
 }catch(e){$('drivers-summary').textContent=e.message;}finally{busy=false;}
}
