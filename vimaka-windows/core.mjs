export const actions = {
  network:{name:'Diagnosticar rede',detail:'Exibe adaptadores, DNS e configuração TCP. Não altera a rede.',admin:false},
  health:{name:'Verificar integridade',detail:'DISM /CheckHealth consulta corrupção já detectada. Não repara arquivos.',admin:true},
  repair:{name:'Reparar arquivos do Windows',detail:'Executa DISM /RestoreHealth e depois SFC /scannow. Pode baixar arquivos da Microsoft e levar vários minutos.',admin:true},
  dns:{name:'Limpar cache DNS',detail:'Limpa somente o cache de resolução de nomes. Não muda o servidor DNS.',admin:true},
  storage:{manual:true,name:'Revisar armazenamento',detail:'Abre as configurações de armazenamento. Você escolhe o que apagar.',admin:false},
  startup:{manual:true,name:'Revisar inicialização',detail:'Abre a lista de aplicativos iniciados com o Windows.',admin:false},
  updates:{manual:true,name:'Abrir Windows Update',detail:'Abre as configurações de atualização. Não instala automaticamente.',admin:false},
  audio:{manual:true,name:'Resolver problemas de áudio',detail:'Abre as configurações de som do Windows.',admin:false},
  printers:{manual:true,name:'Revisar impressoras',detail:'Abre as configurações de impressoras e scanners.',admin:false},
  reliability:{manual:true,name:'Histórico de falhas',detail:'Abre o Monitor de Confiabilidade para investigar travamentos.',admin:false},
  energy:{name:'Ativar Alto desempenho',detail:'Muda o plano de energia e salva o plano anterior. Pode aumentar calor e consumo.',admin:false},
  restoreEnergy:{name:'Restaurar plano anterior',detail:'Restaura o plano salvo pelo botão Alto desempenho deste aplicativo.',admin:false}

};
export function safeAction(id) { if(!Object.hasOwn(actions,id)) throw Error('Ação não permitida.'); return actions[id]; }
export function summarize(raw) {
  return {at:raw.Date?.DateTime || raw.at || new Date().toISOString(),freeGB:Number(raw.OS?.FreePhysicalMemory||0)/1048576,totalGB:Number(raw.OS?.TotalVisibleMemorySize||0)/1048576,startup:(raw.Startup||[]).map(x=>x.Name),remojo:(raw.Remojo||[]).length};
}
