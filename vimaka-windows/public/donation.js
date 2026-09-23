const byId=id=>document.getElementById(id);
let donation;
const message=text=>{byId('donation-status').textContent=text;};
async function copy(value){
  try{await navigator.clipboard.writeText(value);message('Copiado! Abra o Pix no seu banco, confira o recebedor e escolha o valor.');}
  catch{byId('pix-details').open=true;byId('pix-payload').focus();byId('pix-payload').select();message('Não foi possível copiar automaticamente. Selecione o código abaixo e copie com Ctrl+C.');}
}
byId('copy-pix').onclick=()=>{if(donation)copy(donation.payload);};
byId('copy-pix-key').onclick=()=>{if(donation)copy(donation.key);};
async function load(){try{
  const response=await fetch('/donation.json');if(!response.ok)throw Error('Dados do Pix indisponíveis.');
  donation=await response.json();
  if(typeof donation.payload!=='string'||!donation.payload.startsWith('000201')||!/^\+55\d{11}$/.test(donation.key))throw Error('Dados do Pix inválidos.');
  byId('donation-name').textContent=donation.name;byId('donation-city').textContent=donation.city+' · Brasil';
  byId('donation-key').textContent=donation.key;byId('pix-payload').value=donation.payload;
  byId('copy-pix').disabled=false;byId('copy-pix-key').disabled=false;
}catch(e){message(e.message+' Tente abrir o aplicativo novamente.');}}
load();
