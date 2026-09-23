import test from 'node:test';
import assert from 'node:assert/strict';
import {crc16,buildPixPayload} from '../pix.mjs';
test('Pix aceita email confirmado e rejeita email incompleto',()=>{
  const payload=buildPixPayload({key:'vimakasystems@gmail.com',name:'Douglas Cardoso',city:'São Paulo'});
  assert.ok(payload.includes('0123vimakasystems@gmail.com'));
  assert.equal(payload.slice(-4),crc16(payload.slice(0,-4)));
  for(const key of ['vimaka@','vimaka @gmail.com','11945546072'])assert.throws(()=>buildPixPayload({key,name:'Teste',city:'SP'}));
});
test('CRC16 confere com o exemplo oficial do Banco Central',()=>{
  const sample='00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304';
  assert.equal(crc16(sample),'1D3D');
});
test('Pix de valor livre nao define valor e preserva chave celular',()=>{
  const payload=buildPixPayload({key:'+5511999999999',name:'Recebedor Teste',city:'São Paulo'});
  const tags={};for(let i=0;i<payload.length;){const id=payload.slice(i,i+2),len=Number(payload.slice(i+2,i+4));tags[id]=payload.slice(i+4,i+4+len);i+=4+len;}
  assert.equal(tags['54'],undefined);assert.equal(tags['53'],'986');assert.equal(tags['58'],'BR');
  assert.match(tags['26'],/\+5511999999999$/);assert.equal(tags['60'],'SAO PAULO');assert.equal(tags['62'],'0503***');
  assert.equal(tags['63'],crc16(payload.slice(0,-4)));
  assert.throws(()=>buildPixPayload({key:'11999999999',name:'Teste',city:'SP'}));
});
