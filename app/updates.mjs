import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
export const repository='vimakasystems-git/windows_ps1_scritps';
export function newer(next,current){
 const parse=s=>/^\d+\.\d+\.\d+$/.test(s)?s.split('.').map(Number):null;
 const a=parse(next),b=parse(current);if(!a||!b)return false;
 for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;
}
export function targetFor(platform,arch,osRelease=''){
 if(!['x64','arm64'].includes(arch))throw Error('Arquitetura ainda não suportada.');
 if(platform==='win32'&&arch==='x64')return {folder:'windows',suffix:'windows-x64.exe'};
 if(platform==='darwin')return {folder:'macos',suffix:`macos-${arch}.pkg`};
 if(platform==='linux'){
  const ids=osRelease.split('\n').filter(l=>/^(ID|ID_LIKE)=/.test(l)).join(' ').toLowerCase();
  if(/\b(debian|ubuntu|linuxmint|pop)\b/.test(ids))return {folder:'linux',suffix:`linux-${arch}.deb`};
  if(/\b(fedora|rhel|centos|rocky|almalinux)\b/.test(ids))return {folder:'linux',suffix:`linux-${arch}.rpm`};
 }
 throw Error('Não há instalador automático para este sistema. Consulte a página de versões.');
}
export function selectRelease(release,current,target){
 const version=String(release.tag_name||'').replace(/^v/,'');
 if(release.draft||release.prerelease||!/^\d+\.\d+\.\d+$/.test(version))throw Error('Versão publicada inválida.');
 const name=`VimakaWorkstationCare-${version}-${target.suffix}`;
 const asset=release.assets?.find(a=>a.name===name);
 const page=`https://github.com/${repository}/releases/tag/v${version}`;
 if(!newer(version,current))return {available:false,current,version,page};
 const url=`https://github.com/${repository}/releases/download/v${version}/${name}`;
 if(!asset||asset.browser_download_url!==url||!/^sha256:[a-f0-9]{64}$/.test(asset.digest||''))throw Error('Instalador compatível ou checksum não disponível nesta versão.');
 return {available:true,current,version,name,url,sha256:asset.digest.slice(7),size:asset.size,page,sourcePath:`platforms/${target.folder}`};
}
export function createUpdater({current,data,platform=process.platform,arch=process.arch}){
 const downloads=new Map();
 async function check(){
  const distro=platform==='linux'?await fs.readFile('/etc/os-release','utf8').catch(()=>''):'';
  const target=targetFor(platform,arch,distro);
  const r=await fetch(`https://api.github.com/repos/${repository}/releases/latest`,{headers:{Accept:'application/vnd.github+json','User-Agent':'VimakaWorkstationCare'},signal:AbortSignal.timeout(15000)});
  if(r.status===404)return {available:false,current,version:current,page:`https://github.com/${repository}/releases`};
  if(!r.ok)throw Error(`GitHub indisponível (${r.status}). Tente novamente mais tarde.`);
  return selectRelease(await r.json(),current,target);
 }
 async function download(job){
  const release=await check();if(!release.available)throw Error('Você já está na versão mais recente.');
  const dir=path.join(data,'updates');await fs.mkdir(dir,{recursive:true});
  const id=randomUUID(),file=path.join(dir,id+'-'+release.name);
  const r=await fetch(release.url,{signal:AbortSignal.timeout(300000)});
  if(!r.ok||!r.body)throw Error('Falha ao baixar instalador.');
  const limit=300*1024*1024,hash=createHash('sha256');let bytes=0;
  const handle=await fs.open(file,'wx',0o600);
  try{
   for await(const chunk of r.body){bytes+=chunk.length;if(bytes>limit)throw Error('Instalador excedeu o limite de tamanho.');hash.update(chunk);await handle.writeFile(chunk);job.progress=release.size?Math.min(99,Math.round(bytes/release.size*100)):0;job.log=`${release.name}: ${Math.round(bytes/1048576)} MiB`;}
   if(hash.digest('hex')!==release.sha256||bytes!==release.size)throw Error('Checksum/tamanho inválido. Download descartado.');
  }catch(e){await handle.close();await fs.unlink(file).catch(()=>{});throw e;}
  await handle.close();downloads.set(id,{...release,file});job.progress=100;job.update={id,name:release.name,version:release.version};job.log='Download verificado. Abra o instalador para concluir a atualização.';
 }
 async function open(id){
  const entry=downloads.get(id);if(!entry)throw Error('Baixe a atualização novamente.');
  if(createHash('sha256').update(await fs.readFile(entry.file)).digest('hex')!==entry.sha256)throw Error('Instalador foi alterado. Baixe novamente.');
  const file=platform==='win32'?entry.file:platform==='darwin'?'/usr/bin/open':'xdg-open';
  const args=platform==='win32'?[]:[entry.file];
  await new Promise((resolve,reject)=>{const child=spawn(file,args,{detached:platform==='win32',stdio:'ignore',windowsHide:true});child.once('error',reject);if(platform==='win32')child.once('spawn',()=>{child.unref();resolve();});else child.once('close',code=>code===0?resolve():reject(Error('Abra o pacote pelo gerenciador de arquivos: '+entry.file)));});
  return {opened:true};
 }
 return {check,download,open};
}
