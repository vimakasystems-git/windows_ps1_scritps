# Vimaka Windows Care 0.1.0

Aplicativo local para Windows: painel PWA, diagnostico, comparacao antes/depois, ferramentas de reparo e laboratorio Windows Sandbox. Versao de avaliacao; nao e uma garantia de ganho de desempenho nem uma plataforma universal para executar qualquer programa Windows.

## Instalar e abrir

Execute `build/VimakaWindowsCare-Setup.exe`. Instala por usuario em `%LOCALAPPDATA%\VimakaWindowsCare\app`, cria atalhos na area de trabalho/menu Iniciar e registra inicializacao automatica do componente local, sem elevacao. Nenhum tuning ou reparo e executado na instalacao.

O executavel abre uma janela do Edge em `http://127.0.0.1:47831`. A interface tambem pode ser instalada como PWA pelo navegador. A PWA precisa do componente local para diagnosticar e executar ferramentas; o cache offline inclui apenas a interface, nunca os diagnosticos. O instalador e o launcher desta versao nao possuem assinatura digital de distribuicao. Nao contorne bloqueios de seguranca do Windows; para distribuicao ampla, assine e valide os binarios em maquinas limpas.

Requer Windows x64, .NET Framework 4.x e Edge ou outro navegador moderno. O pacote inclui Node.js, com assinatura original validada no build; nao precisa baixar dependencias npm. A atualizacao do runtime nao e automatica.

## Desenvolvimento e build

```powershell
node server.mjs
node --test tests/*.test.mjs
.\build.ps1
```

O build requer Node.js assinado ja instalado, Windows PowerShell 5.1 e o compilador .NET Framework. Dados reais nunca entram no instalador. Para atualizar, use Encerrar componente local no rodape e gere uma nova pasta build. `-NodePath` seleciona um runtime assinado e `-BuildDirectory build-release` preserva um build anterior. O build desta sessao usa Node.js 24.21.0 LTS obtido do site oficial, com SHA-256 conferido e assinatura Authenticode valida.

## Comparacao e ferramentas

A primeira leitura e a referencia. Atualizar diagnostico preserva essa referencia e coleta a situacao atual. Exportar relatorio gera HTML para leitura ou impressao em PDF. RAM livre varia conforme a carga; sem benchmarks controlados nao se deve afirmar que o computador ficou mais rapido.

Ferramentas: diagnostico de rede, DISM CheckHealth, DISM RestoreHealth seguido de SFC, cache DNS, configuracoes de armazenamento/inicializacao/atualizacoes/som/impressoras, Monitor de Confiabilidade e plano de energia reversivel. Reparos exigem revisao na interface e elevacao quando necessario. O historico distingue falha, conclusao e interrupcao. Operacoes administrativas podem demorar; nao desligue o computador durante reparos.

## Cerebro Brasil e sandbox

O site oficial bloqueia iframes (`X-Frame-Options: DENY`). O app abre uma janela propria do site. Copie a resposta do chat e cole no laboratorio; o app extrai blocos PowerShell para revisao. Nao ha API autenticada de conversas integrada, captura silenciosa de chats ou execucao automatica de respostas na maquina principal.

O roteiro so e executado no Windows Sandbox depois de revisao, confirmacao e verificacao de hash. Compartilha apenas a pasta do teste em modo somente leitura. Rede, camera, microfone, impressoras, clipboard e vGPU ficam desabilitados por padrao. A rede e opcional e tambem permite acessar a rede local. Nao se compartilham pastas de documentos do usuario. Downloads escolhidos no catalogo WinGet sao copiados para `packages` na sandbox, onde o usuario pode abrir os instaladores.

Habilitar Sandbox requer Windows Pro/Enterprise/Education compativel e virtualizacao. Pode exigir reboot; o app nao reinicia automaticamente. Windows Home, ARM e programas com requisitos especiais nao foram validados. A existencia do executavel Sandbox nao prova que a virtualizacao funciona. O status de abertura significa somente que o Windows recebeu a solicitacao; confira o resultado dentro da sandbox. O log interno e descartado ao fecha-la. A sandbox nao atesta que o programa e seguro nem cobre drivers, firmware, todo malware ou qualquer carga de trabalho.

## Seguranca e privacidade

Servidor sem privilegios, apenas em 127.0.0.1. Host/origem validados, sem CORS, token de sessao para mutacoes, catalogo fechado de acoes nativas, sem endpoint generico de shell no host. Processos usam argumentos separados. Nenhuma credencial de nuvem e necessaria. Diagnosticos, logs e roteiros ficam em `%LOCALAPPDATA%\VimakaWindowsCare\data`; nao publique esse diretorio.

O catalogo inclui 27 links copiados de https://vimakasistemas.com.br/ecosistema. Os links abrem os servicos oficiais; as funcionalidades desses servicos nao fazem parte do aplicativo local. O logotipo foi obtido do favicon oficial do site Vimaka. Os icones PWA sao variantes dimensionadas desse ativo.

## Desinstalar

Use Aplicativos instalados no Windows ou execute `native/Uninstall.ps1` da pasta instalada. Remove o app, o componente local e os atalhos; preserva diagnosticos, historico, recursos Windows habilitados e ajustes aplicados. Remova a PWA separadamente pelo navegador. O script PowerShell de tuning anterior e independente deste app.

## Referencias

- https://support.microsoft.com/en-us/support/get-help/windows-troubleshooters
- https://support.microsoft.com/en-us/windows/deployment/updates-lifecycle/troubleshoot-problems-updating-windows
- https://support.microsoft.com/en-us/windows/experience/storage-filemanagement/free-up-drive-space-in-windows
- https://support.microsoft.com/en-us/windows/hardware/audio/fix-sound-or-audio-problems-in-windows
- https://support.microsoft.com/en-us/windows/experience/backup-recovery/using-system-file-checker-in-windows
- https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-install
- https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file
- https://learn.microsoft.com/en-us/windows/package-manager/winget/download

As categorias foram escolhidas a partir dos guias de problemas recorrentes da Microsoft, nao de um ranking estatistico de frequencia.
