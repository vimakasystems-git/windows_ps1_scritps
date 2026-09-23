import test from 'node:test';
import assert from 'node:assert/strict';
import {safeAction,safePackage,extractScript,sandboxConfig,hash} from '../core.mjs';
test('ações e pacotes não permitem comandos ou propriedades herdadas',()=>{
 for(const id of ['__proto__','constructor','repair; Remove-Item C:\\','x']){assert.throws(()=>safeAction(id));assert.throws(()=>safePackage(id));}
 assert.equal(safeAction('network').admin,false);assert.equal(safePackage('git'),'Git.Git');
});
test('revisão extrai apenas PowerShell e vincula conteúdo ao hash',()=>{
 const draft=extractScript('Instruções\n```powershell\nWrite-Output "ok"\n```\nNão execute isto');
 assert.equal(draft.script,'Write-Output "ok"\n');assert.equal(draft.hash,hash(draft.script));
 assert.notEqual(draft.hash,hash(draft.script+'x'));assert.throws(()=>extractScript(''));assert.throws(()=>extractScript('a'.repeat(100001)));
});
test('sandbox não compartilha escrita nem rede por padrão e escapa XML',()=>{
 const xml=sandboxConfig('C:\\A&B<test>');
 assert.match(xml,/<Networking>Disable<\/Networking>/);assert.match(xml,/<ReadOnly>true<\/ReadOnly>/);
 assert.match(xml,/A&amp;B&lt;test&gt;/);assert.match(xml,/<ClipboardRedirection>Disable/);
 assert.match(sandboxConfig('C:\\test',true),/<Networking>Enable/);
});
