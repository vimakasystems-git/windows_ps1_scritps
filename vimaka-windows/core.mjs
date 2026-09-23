import crypto from 'node:crypto';
export const packages = {git:'Git.Git',vscode:'Microsoft.VisualStudioCode',sevenzip:'7zip.7zip',powertoys:'Microsoft.PowerToys'};
export const actions = {
  network:{name:'Diagnosticar rede',detail:'Exibe adaptadores, DNS e configuração TCP. Não altera a rede.',admin:false},
  health:{name:'Verificar integridade',detail:'DISM /CheckHealth consulta corrupção já detectada. Não repara arquivos.',admin:true},
  repair:{name:'Reparar arquivos do Windows',detail:'Executa DISM /RestoreHealth e depois SFC /scannow. Pode baixar arquivos da Microsoft e levar vários minutos.',admin:true},
  dns:{name:'Limpar cache DNS',detail:'Limpa somente o cache de resolução de nomes. Não muda o servidor DNS.',admin:true},
  storage:{name:'Revisar armazenamento',detail:'Abre as configurações de armazenamento. Você escolhe o que apagar.',admin:false},
  startup:{name:'Revisar inicialização',detail:'Abre a lista de aplicativos iniciados com o Windows.',admin:false},
  updates:{name:'Abrir Windows Update',detail:'Abre as configurações de atualização. Não instala automaticamente.',admin:false},
  audio:{name:'Resolver problemas de áudio',detail:'Abre as configurações de som do Windows.',admin:false},
  printers:{name:'Revisar impressoras',detail:'Abre as configurações de impressoras e scanners.',admin:false},
  reliability:{name:'Histórico de falhas',detail:'Abre o Monitor de Confiabilidade para investigar travamentos.',admin:false},
  energy:{name:'Ativar Alto desempenho',detail:'Muda o plano de energia e salva o plano anterior. Pode aumentar calor e consumo.',admin:false},
  restoreEnergy:{name:'Restaurar plano anterior',detail:'Restaura o plano salvo pelo botão Alto desempenho deste aplicativo.',admin:false},
  sandboxEnable:{name:'Habilitar Windows Sandbox',detail:'Habilita o recurso oficial de isolamento do Windows. Requer edição compatível e virtualização; pode exigir reinicialização, que não será automática.',admin:true}
};
export function safeAction(id) { if(!Object.hasOwn(actions,id)) throw Error('Ação não permitida.'); return actions[id]; }
export function safePackage(id) { if(!Object.hasOwn(packages,id)) throw Error('Pacote fora do catálogo.'); return packages[id]; }
export function hash(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
export function extractScript(text) {
  if(typeof text !== 'string' || text.length>100000 || !text.trim()) throw Error('Cole uma resposta com até 100 mil caracteres.');
  const blocks=[...text.matchAll(/```(?:powershell|ps1|pwsh)\s*\r?\n([\s\S]*?)```/gi)];
  const script=blocks.length?blocks.map(x=>x[1]).join('\n\n'):text;
  return {script,hash:hash(script),warnings:[
    /Invoke-WebRequest|Invoke-RestMethod|curl|wget|https?:/i.test(script)&&'O texto contém acesso à rede. A sandbox está sem rede por padrão.',
    /Remove-Item|format-volume|diskpart|Clear-Disk/i.test(script)&&'O texto contém exclusão ou alteração de discos.',
    /Set-MpPreference|DisableRealtimeMonitoring|Set-NetFirewall/i.test(script)&&'O texto contém alteração de proteção de segurança.',
    /EncodedCommand|FromBase64String|Invoke-Expression|\biex\b/i.test(script)&&'O texto contém execução indireta ou codificada.'
  ].filter(Boolean)};
}
export function escapeXml(value) { return String(value).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c])); }
export function sandboxConfig(folder,network=false) {
  return `<Configuration><VGpu>Disable</VGpu><Networking>${network?'Enable':'Disable'}</Networking><AudioInput>Disable</AudioInput><VideoInput>Disable</VideoInput><PrinterRedirection>Disable</PrinterRedirection><ClipboardRedirection>Disable</ClipboardRedirection><MemoryInMB>4096</MemoryInMB><MappedFolders><MappedFolder><HostFolder>${escapeXml(folder)}</HostFolder><SandboxFolder>C:\\VimakaInput</SandboxFolder><ReadOnly>true</ReadOnly></MappedFolder></MappedFolders><LogonCommand><Command>powershell.exe -NoExit -ExecutionPolicy Bypass -File C:\\VimakaInput\\run.ps1</Command></LogonCommand></Configuration>`;
}
export function summarize(raw) {
  return {at:raw.Date?.DateTime || raw.at || new Date().toISOString(),freeGB:Number(raw.OS?.FreePhysicalMemory||0)/1048576,totalGB:Number(raw.OS?.TotalVisibleMemorySize||0)/1048576,startup:(raw.Startup||[]).map(x=>x.Name),remojo:(raw.Remojo||[]).length};
}
