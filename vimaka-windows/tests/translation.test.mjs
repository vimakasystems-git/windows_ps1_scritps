import test from 'node:test';
import assert from 'node:assert/strict';
import {rows} from '../public/translations.js';
import {translate} from '../public/translation-core.js';

test('translation catalog contains only complete nonempty triples',()=>{
 for(const row of rows){assert.equal(row.length,3);for(const value of row)assert.ok(value.trim());}
});
test('navigation icons and unknown labels never acquire undefined',()=>{
 for(const lang of ['pt-BR','en','es']){
  for(const text of ['◫','⌘','✳','⊞','↺','♡',' | ','Vimaka Sistemas Inteligentes','Unknown text'])assert.equal(translate(text,lang),text);
  for(const [text,en,es] of rows)assert.equal(translate(text,lang),lang==='en'?en:lang==='es'?es:text);
 }
 assert.equal(translate('◫ Visão geral','en'),'◫ Overview');
 assert.equal(translate('◫ Visão geral','es'),'◫ Vista general');
});
