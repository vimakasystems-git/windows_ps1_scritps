// BR Code estatico, sem campo 54: o pagador informa o valor no banco.
export function crc16(text){
  let crc=0xffff;
  for(const byte of new TextEncoder().encode(text)){
    crc^=byte<<8;
    for(let i=0;i<8;i++)crc=crc&0x8000?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4,'0');
}
export function field(id,value){
  const size=new TextEncoder().encode(value).length;
  if(!/^\d{2}$/.test(id)||size>99)throw Error('Campo BR Code invalido.');
  return id+String(size).padStart(2,'0')+value;
}
function merchantText(value,max){
  const normalized=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 .-]/g,'').trim();
  if(!normalized||normalized.length>max)throw Error(`Nome/cidade deve ter entre 1 e ${max} caracteres normalizados.`);
  return normalized;
}
export function buildPixPayload({key,name,city}){
  if(typeof key!=='string'||!/^\+55\d{11}$/.test(key))throw Error('Use a chave celular confirmada no formato +55DDDNÚMERO.');
  const payload=field('00','01')+field('26',field('00','br.gov.bcb.pix')+field('01',key))+field('52','0000')+field('53','986')+field('58','BR')+field('59',merchantText(name,25))+field('60',merchantText(city,15))+field('62',field('05','***'))+'6304';
  return payload+crc16(payload);
}
