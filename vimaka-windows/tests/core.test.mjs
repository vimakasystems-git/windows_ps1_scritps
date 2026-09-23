import test from 'node:test';
import assert from 'node:assert/strict';
import {safeAction} from '../core.mjs';
test('catalogo permite reparos fixos e rejeita comandos e sandbox removida',()=>{
 for(const id of ['__proto__','constructor','repair; Remove-Item C:\\','x','sandboxEnable'])assert.throws(()=>safeAction(id));
 assert.equal(safeAction('network').admin,false);
 assert.equal(safeAction('repair').admin,true);
});