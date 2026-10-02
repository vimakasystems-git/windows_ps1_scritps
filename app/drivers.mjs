import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
export const manufacturers={
 intel:{name:'Intel',portal:'https://www.intel.com/content/www/us/en/support/detect.html',hosts:['downloadmirror.intel.com'],signer:'Intel'},
 nvidia:{name:'NVIDIA',portal:'https://www.nvidia.com/en-us/drivers/',hosts:['us.download.nvidia.com','international.download.nvidia.com','download.nvidia.com'],signer:'NVIDIA'},
 amd:{name:'AMD',portal:'https://www.amd.com/en/support/download/drivers.html',hosts:['drivers.amd.com'],signer:'Advanced Micro Devices'},
 dell:{name:'Dell',portal:'https://www.dell.com/support/home/en-us?app=drivers',hosts:['dl.dell.com','downloads.dell.com'],signer:'Dell'},
 hp:{name:'HP',portal:'https://support.hp.com/us-en/drivers',hosts:['ftp.hp.com'],signer:'HP'},
 lenovo:{name:'Lenovo',portal:'https://pcsupport.lenovo.com/us/en/',hosts:['download.lenovo.com'],signer:'Lenovo'},
 positivo:{name:'Positivo',portal:'https://www.meupositivo.com.br/para-voce/suporte-tecnico/drivers',hosts:[],note:'Informe o número de série no portal oficial. Download e instalação pelo fabricante; importação automática ainda indisponível.'},
 asus:{name:'ASUS',portal:'https://www.asus.com/support/download-center',hosts:[],note:'Selecione modelo e Windows no portal oficial; pacotes ZIP e utilitários OEM seguem o assistente do fabricante.'},
 acer:{name:'Acer',portal:'https://www.acer.com/gb-en/support/drivers-and-manuals',hosts:[],note:'Consulte modelo ou SNID no portal. Instalação pelo pacote oficial do equipamento.'},
 msi:{name:'MSI',portal:'https://www.msi.com/support/download',hosts:[],note:'Selecione o modelo ou use MSI Center oficial. Importação automática ainda indisponível.'},
 gigabyte:{name:'Gigabyte',portal:'https://www.gigabyte.com/Support/Consumer/Download',hosts:[],note:'Confira modelo e revisão do hardware no portal oficial.'},
 samsung:{name:'Samsung',portal:'https://www.samsung.com/us/support/downloads/',hosts:[],note:'Selecione o modelo do Galaxy Book/PC e siga a ferramenta oficial.'},
 huawei:{name:'Huawei',portal:'https://consumer.huawei.com/cn/support/driver-list/',hosts:[],note:'Portal oficial por modelo/região; pode exigir PC Manager oficial. Importação automática ainda indisponível.'},
 dynabook:{name:'Dynabook / Toshiba',portal:'https://support.dynabook.com/drivers',hosts:[],note:'Confira modelo, região e sistema operacional no suporte oficial.'},
 lg:{name:'LG',portal:'https://www.lg.com/us/support/software-firmware-drivers',hosts:[],note:'Selecione o modelo/região para obter o pacote oficial. Importação automática ainda indisponível.'}
};
export function officialDriverURL(value,vendor){
 const v=manufacturers[vendor];if(!v)throw Error('Fabricante não suportado para download assistido.');if(!v.hosts.length)throw Error('Este fabricante usa o fluxo do portal oficial indicado. Importação automática de pacotes ainda indisponível.');
 const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.port||!v.hosts.includes(url.hostname.toLowerCase())||!/\.exe$/i.test(url.pathname))throw Error('Use o link HTTPS de um instalador EXE no domínio oficial de download do fabricante selecionado.');
 return url;
}
export function requireDriverSelection(scan,deviceId,compatible){
 if(!scan||Date.now()-Date.parse(scan.at)>24*3600000||!Number.isFinite(Date.parse(scan.at)))throw Error('Execute novamente o diagnóstico de drivers (válido por 24 horas).');
 const device=scan.devices?.find(d=>d.DeviceID===deviceId);if(!device)throw Error('Selecione um dispositivo encontrado no diagnóstico.');
 if(compatible!==true)throw Error('Confira no fabricante o modelo, ID de hardware, Windows, arquitetura e compatibilidade do pacote.');return device;
}
export function requireDriverVendor(scan,device,vendor){
 const text=[device.Manufacturer,device.DriverProviderName,device.DeviceID,...(Array.isArray(device.HardwareID)?device.HardwareID:[device.HardwareID])].join(' ');
 const component={intel:/Intel|VEN_8086/i,nvidia:/NVIDIA|VEN_10DE/i,amd:/AMD|Advanced Micro Devices|VEN_1002|VEN_1022/i};
 const oem={dell:/Dell/i,hp:/HP|Hewlett.Packard/i,lenovo:/Lenovo/i};
 if(component[vendor]?.test(text)||oem[vendor]?.test(scan.computer?.Manufacturer||''))return;
 throw Error('O fabricante selecionado não corresponde ao dispositivo ou ao fabricante deste computador. Use o portal OEM para atendimento específico.');
}
export async function downloadOfficialDriver({url,vendor,folder,fetcher=fetch,onProgress=()=>{}}){
 let current=officialDriverURL(url,vendor),response;
 for(let i=0;i<5;i++){response=await fetcher(current,{redirect:'manual',signal:AbortSignal.timeout(180000)});if([301,302,303,307,308].includes(response.status)){const next=new URL(response.headers.get('location'),current);current=officialDriverURL(next.href,vendor);await response.body?.cancel();continue;}break;}
 if(!response?.ok||!response.body)throw Error('Download oficial indisponível ou redirecionamento não autorizado.');
 const total=Number(response.headers.get('content-length'))||0,max=2*1024**3;if(total>max)throw Error('Pacote excede 2 GiB.');
 await fs.mkdir(folder,{recursive:true});const id=crypto.randomUUID(),file=path.join(folder,id+'.exe'),hash=crypto.createHash('sha256');let count=0,handle;
 try{handle=await fs.open(file,'wx');for await(const chunk of response.body){count+=chunk.length;if(count>max)throw Error('Pacote excede 2 GiB.');hash.update(chunk);await handle.writeFile(chunk);onProgress({bytes:count,total});}if(!count||total&&count!==total)throw Error('Download incompleto.');await handle.close();handle=null;return {id,file,url:current.href,vendor,sha256:hash.digest('hex'),bytes:count,at:new Date().toISOString()};}
 catch(e){await handle?.close();await fs.unlink(file).catch(()=>{});throw e;}
}
