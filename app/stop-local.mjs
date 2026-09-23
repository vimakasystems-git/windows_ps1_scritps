export async function stopLocal(){
 const base='http://127.0.0.1:47831';let response;
 try{response=await fetch(base+'/api/session',{signal:AbortSignal.timeout(1500)});}catch{return;}
 const session=await response.json();if(session.local!==true||typeof session.csrf!=='string'||typeof session.version!=='string')throw Error('Porta 47831 ocupada por outro aplicativo.');
 const r=await fetch(base+'/api/shutdown',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Vimaka-Token':session.csrf},body:'{"confirm":true}',signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw Error('Conclua as operações do Vimaka Workstation Care antes de instalar.');
 await new Promise(r=>setTimeout(r,1000));
}
if(process.argv.includes('--stop'))await stopLocal();
