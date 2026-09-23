import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PNG} from 'pngjs';
import jsQR from 'jsqr';
import {buildPixPayload} from '../pix.mjs';
test('imagem QR decodifica para o mesmo Pix Copia e Cola publicado',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../public/donation.json',import.meta.url),'utf8'));
  const png=PNG.sync.read(fs.readFileSync(new URL('../public/donation-qr.png',import.meta.url)));
  const decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);
  assert.ok(decoded,'QR precisa ser legível');assert.equal(decoded.data,data.payload);
  assert.equal(data.payload,buildPixPayload(data));assert.equal(data.amount,null);
  assert.equal(data.key,'+5511945546072');assert.equal(data.name,'Douglas Cardoso');assert.equal(data.city,'São Paulo');
});
