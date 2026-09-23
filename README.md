# Windows PowerShell Scripts

Scripts para auditar e ajustar o Windows para uma rotina de desenvolvimento.

## Aplicativo Vimaka Windows Care

A pasta [vimaka-windows](vimaka-windows/README.md) contem um aplicativo local com interface PWA, instalador Windows, comparativo antes/depois, ferramentas de diagnostico e reparo, laboratorio Windows Sandbox e links para as 27 solucoes do ecossistema Vimaka. Esta em versao de avaliacao 0.1.3. Consulte os requisitos, limites e instrucoes de compilacao no README do aplicativo.

## Windows-Dev-Tuning.ps1

Requer Windows PowerShell 5.1. Sem parametros, apenas gera uma auditoria:

```powershell
.\Windows-Dev-Tuning.ps1 -Mode Audit
```

Para instalar, execute `Instalar-Tuning.cmd` como administrador na mesma conta usada normalmente, ou abra Windows PowerShell como administrador:

```powershell
.\Windows-Dev-Tuning.ps1 -Mode Install
```

### Alteracoes aplicadas

- Ativa o plano Alto desempenho, que precisa estar disponivel no Windows.
- Reduz transparencia, animacoes de janelas/barra de tarefas e atraso dos menus.
- Remove da inicializacao do usuario as entradas Teams, Grammarly e MicrosoftEdgeAutoLaunch.
- Remove entradas de inicializacao do usuario que apontem para a pasta Remojo.
- Interrompe e exclui servicos com executaveis em `C:\Program Files\Remojo\`, incluindo RemojoBlockerService. Se a parada normal falhar, tenta encerrar o processo apos conferir seu caminho.
- Desabilita tarefas agendadas que executem diretamente arquivos nessa pasta e encerra processos Remojo. Mantem os arquivos instalados; nao e uma desinstalacao completa.
- Cria a tarefa `WindowsDevTuning-Logon`, que reaplica o plano de energia a cada login, inclusive depois de reiniciar.

Preserva sincronizacao de arquivos, ferramentas de desenvolvimento, antivirus, atualizacoes, drivers e adaptadores virtuais. Nao encerra outros aplicativos abertos. Nao limpa RAM artificialmente, apaga caches de compilacao nem altera DNS, TCP, VPN ou proxy. A auditoria ajuda a identificar limitacoes de rede; o script nao promete aumento de velocidade da internet.

**Install remove servicos Remojo. Revise o codigo antes de executar.** Alto desempenho pode aumentar calor, consumo de energia e reduzir autonomia. Os efeitos visuais podem exigir novo login.

### Backup e reversao

Os backups dos valores alterados, inventarios e logs ficam em `%ProgramData%\WindowsDevTuning`, com acesso restrito a administradores e SYSTEM. A tarefa elevada executa uma copia do script nessa pasta protegida.

Para reverter energia, interface e entradas de inicializacao, execute como administrador na conta original:

```powershell
& "$env:ProgramData\WindowsDevTuning\Windows-Dev-Tuning.ps1" -Mode Restore
```

Restore remove a tarefa de manutencao e reativa tarefas Remojo anteriormente habilitadas. **Nao recria servicos excluidos: reinstale o Remojo para recuperacao completa.** Os backups `.reg` sao preservados para diagnostico.

A instalacao nao e atomica: se falhar, consulte o log e use Restore para desfazer os ajustes ja aplicados. O modo Complete retoma apenas a remocao de servicos/processos Remojo e a criacao da tarefa depois que o backup e os ajustes iniciais ja foram gravados. Nao execute Complete como instalacao nova. A pasta de backup e mantida depois de Restore; Install recusa sobrescreve-la. Nao exclua essa pasta enquanto a tarefa estiver registrada.

### Escopo e verificacao

A auditoria de inicializacao nao cobre todos os mecanismos de autoexecucao. Drivers, extensoes de navegador e tarefas que invoquem Remojo indiretamente nao sao removidos.

Sintaxe e auditoria foram verificadas em Windows PowerShell 5.1; uma instalacao local e a tarefa de manutencao foram executadas. Isso nao garante compatibilidade com todos os equipamentos ou politicas corporativas.

A versao publicada verifica se as chaves do Registro existem antes de cria-las, preservando outras preferencias. Uma versao preliminar usava criacao forcada de chaves existentes; essa falha foi corrigida antes da publicacao. O backup cobre os valores selecionados pelo script, nao todo o Registro.

Nao publique arquivos de auditoria, logs ou backups: eles podem conter dados da maquina e do usuario.

Referencias: [desempenho no Windows](https://support.microsoft.com/en-us/windows/experience/performance-optimization/tips-to-improve-pc-performance-in-windows) e [autotuning TCP](https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/tcpip-performance-known-issues).
