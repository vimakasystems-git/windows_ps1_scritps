# Vimaka Windows Care 0.1.6

Aplicativo local para Windows: painel PWA, diagnostico, comparacao antes/depois, ferramentas de reparo do Windows. Versao de avaliacao; nao e uma garantia de ganho de desempenho .

## Instalar e abrir

Execute `build/VimakaWindowsCare-Setup-0.1.6.exe`. O nome inclui automaticamente a versao de `package.json` nas proximas compilacoes. Instala por usuario em `%LOCALAPPDATA%\VimakaWindowsCare\app`, cria atalhos na area de trabalho/menu Iniciar e registra inicializacao automatica do componente local, sem elevacao. Nenhum tuning ou reparo e executado na instalacao.

O executavel abre uma janela do Edge em `http://127.0.0.1:47831`. A interface tambem pode ser instalada como PWA pelo navegador. A PWA precisa do componente local para diagnosticar e executar ferramentas; o cache offline inclui apenas a interface, nunca os diagnosticos. O instalador e o launcher desta versao nao possuem assinatura digital de distribuicao. Nao contorne bloqueios de seguranca do Windows; para distribuicao ampla, assine e valide os binarios em maquinas limpas.

Requer Windows x64, .NET Framework 4.x e Edge ou outro navegador moderno. O pacote inclui Node.js, com assinatura original validada no build; nao precisa baixar dependencias npm. A atualizacao do runtime nao e automatica.

## Desenvolvimento e build

```powershell
npm ci --ignore-scripts
node server.mjs
node --test tests/*.test.mjs
.\build.ps1
```

O build requer Node.js assinado ja instalado, Windows PowerShell 5.1 e o compilador .NET Framework. Dados reais nunca entram no instalador. Para atualizar, execute o novo instalador. Ele verifica os requisitos, informa o plano de instalacao, solicita o encerramento seguro do componente e substitui os arquivos antigos. Se houver uma operacao em andamento, aguarda sua conclusao pelo usuario. Gere uma nova pasta build ao compilar. `-NodePath` seleciona um runtime assinado e `-BuildDirectory build-release` preserva um build anterior. O build desta sessao usa Node.js 24.21.0 LTS obtido do site oficial, com SHA-256 conferido e assinatura Authenticode valida.

## Comparacao e ferramentas

A primeira leitura e a referencia. Atualizar diagnostico preserva essa referencia e coleta a situacao atual. Exportar relatorio gera HTML para leitura ou impressao em PDF. RAM livre varia conforme a carga; sem benchmarks controlados nao se deve afirmar que o computador ficou mais rapido.

Ferramentas: diagnostico de rede, DISM CheckHealth, DISM RestoreHealth seguido de SFC, cache DNS, configuracoes de armazenamento/inicializacao/atualizacoes/som/impressoras, Monitor de Confiabilidade e plano de energia reversivel. Reparos exigem revisao na interface e elevacao quando necessario. O historico distingue falha, conclusao e interrupcao. Operacoes administrativas podem demorar; nao desligue o computador durante reparos.

## Cerebro Brasil

Abre o site em uma janela propria para consultar orientacoes. O aplicativo nao le conversas privadas nem importa ou executa comandos do chat. Use as ferramentas fixas de diagnostico e reparo apos revisar sua descricao.

O laboratorio, a execucao de scripts e o download de pacotes foram retirados deste produto na versao 0.1.6. Historicos e arquivos anteriores sao preservados; o recurso opcional Windows Sandbox ja habilitado no sistema nao e alterado por esta atualizacao.

## Seguranca e privacidade

Servidor sem privilegios, apenas em 127.0.0.1. Host/origem validados, sem CORS, token de sessao para mutacoes, catalogo fechado de acoes nativas, sem endpoint generico de shell no host. Processos usam argumentos separados. Nenhuma credencial de nuvem e necessaria. Diagnosticos, logs e roteiros ficam em `%LOCALAPPDATA%\VimakaWindowsCare\data`; nao publique esse diretorio.

O catalogo inclui 27 links copiados de https://vimakasistemas.com.br/ecosistema. Os links abrem os servicos oficiais; as funcionalidades desses servicos nao fazem parte do aplicativo local. O logotipo e o arquivo fornecido pelo usuario. Os icones usam o simbolo V extraido desse mesmo ativo, sem redesenho. A identidade segue vimaka.com (redireciona ao site oficial): branco #FDFDFD, texto #0F1729, azul #0059FF e fontes Inter, Space Grotesk e JetBrains Mono. As fontes ficam locais, com licencas OFL em public/fonts.

## Desinstalar

Use Aplicativos instalados no Windows ou execute `native/Uninstall.ps1` da pasta instalada. Remove o app, o componente local e os atalhos; preserva diagnosticos, historico, recursos Windows habilitados e ajustes aplicados. Remova a PWA separadamente pelo navegador. O script PowerShell de tuning anterior e independente deste app.

## Referencias

- https://support.microsoft.com/en-us/support/get-help/windows-troubleshooters
- https://support.microsoft.com/en-us/windows/deployment/updates-lifecycle/troubleshoot-problems-updating-windows
- https://support.microsoft.com/en-us/windows/experience/storage-filemanagement/free-up-drive-space-in-windows
- https://support.microsoft.com/en-us/windows/hardware/audio/fix-sound-or-audio-problems-in-windows
- https://support.microsoft.com/en-us/windows/experience/backup-recovery/using-system-file-checker-in-windows

As categorias foram escolhidas a partir dos guias de problemas recorrentes da Microsoft, nao de um ranking estatistico de frequencia.

## Apoie o desenvolvedor

A pagina de apoio oferece QR Code Pix de valor livre, Copia e Cola, copia da chave e download do QR. Recebedor informado: Douglas Cardoso, Sao Paulo; chave e-mail vimakasystems@gmail.com. O pagador escolhe o valor e confere o recebedor no aplicativo do banco. O app nao processa nem confirma pagamentos.

O QR e gerado localmente, sem API externa. Para regenerar depois de instalar as dependencias de desenvolvimento:

```powershell
node generate-donation.mjs 'vimakasystems@gmail.com' 'Douglas Cardoso' 'São Paulo'
```

Os testes verificam o CRC com exemplo do Banco Central, ausencia de valor fixo e decodificacao do PNG para o mesmo payload. Isso nao valida o cadastro da chave em um banco. As dependencias npm servem apenas para geracao e testes; o instalador usa os arquivos prontos.
## Idiomas e contato

Interface em portugues (Brasil), ingles e espanhol. Use o seletor de idioma no topo; a preferencia fica salva no navegador. Sem preferencia salva, usa o idioma do navegador quando suportado, senao portugues. Textos de interface, ferramentas, confirmacoes e relatorio acompanham a escolha. Comandos, entradas do usuario, evidencias e logs nativos preservam o idioma original. As mensagens do instalador/launcher seguem o idioma do Windows (pt/en/es); mensagens nativas do sistema e logs nao sao traduzidos.

O rodape inclui encomendas de software Windows pelo WhatsApp +55 11 94554-6072 (https://wa.me/5511945546072) e https://vimaka.com. O contato abre externamente; nenhuma mensagem e enviada automaticamente.
## Atualizacao e requisitos (0.1.6)

O instalador extrai o pacote em uma pasta temporaria, verifica Windows x64/PowerShell 5.1, testa o Node incluido e verifica navegador compativel. Mostra o que sera instalado e por que. Se faltar navegador, oferece instalar Edge pelo catalogo oficial da Microsoft, verificando SHA-256 e Authenticode antes de chamar o instalador. Essa dependencia exige autorizacao do administrador. Falhas de download, cancelamento ou requisitos incompativeis interrompem a atualizacao.

Windows PowerShell e .NET Framework sao componentes do Windows suportado; se estiverem ausentes ou danificados, e necessario reparar o Windows com o administrador. O executavel nao consegue inicializar sem .NET Framework. Nao ha instalacao automatica de componentes do sistema danificados.

Nao encerra processos a forca nem interrompe reparos. A pasta app anterior e movida para previous-ID em %LOCALAPPDATA%\VimakaWindowsCare; os dados ficam intactos. Arquivos obsoletos deixam de fazer parte da instalacao ativa. O registro e os atalhos sao atualizados. Se a troca falhar, tenta restaurar a pasta anterior. Backups permanecem para recuperacao. O resumo fica em last-install.txt e erros em %TEMP%\Vimaka-install-error.txt.

O app instala por usuario, sem elevacao. DISM, SFC e limpeza DNS pedem permissao atraves do UAC do Windows. O app explica previamente que uma conta administradora e necessaria. Sem credenciais, o usuario deve cancelar e procurar o administrador. Senhas nunca sao pedidas ou guardadas pelo app.

Validacao local: atualizacao com componente em execucao e preservacao de comparison.json/history.json. Nao validado em conta padrao separada nem em maquina sem navegador; esses cenarios precisam de teste em Windows limpo antes de distribuicao ampla.
## Diagnóstico, melhoria e benchmark (0.1.6)

A tela inicial oferece Executar diagnóstico e Melhorar desempenho. Cada execução mostra tempo decorrido, log nativo, checklist e progresso por etapas concluídas (não estimativa de tempo). Falhas e etapas ignoradas ficam explícitas. O fluxo de melhoria registra antes/depois, mede o desempenho, diagnostica rede, ativa Alto desempenho, limpa DNS e verifica/repara arquivos do Windows. Se houver reinício pendente, pula DISM/SFC e informa o motivo. Não desativa serviços ou aplicativos indiscriminadamente.

O relatório HTML reúne CPU, GPU, memória, discos, placa-mãe, BIOS, sistema, inicialização, comparação e etapas executadas. Os dados ficam locais; revise o relatório antes de compartilhá-lo. Telas manuais de configuração não fazem parte dos fluxos automáticos. Quando abertas pelas ferramentas individuais, solicita fechamento após 10 segundos somente se identificar uma nova janela; janelas preexistentes ou compartilhadas são preservadas.

O protocolo vimaka-micro-v1 mede SHA-256 em uma thread (mediana de três amostras após aquecimento), cópia de memória e escrita/leitura de arquivo temporário de 32 MiB. A leitura pode vir do cache do sistema; não é medição do disco físico. Resultados variam com carga, temperatura e runtime. Variação negativa também é exibida, sem prometer aceleração. Não testa GPU nem equivale a uma avaliação completa do computador.

A comparação opcional aceita pontuação Geekbench 7 CPU Single-Core informada pelo usuário. Exibe a posição entre seis CPUs selecionadas da tabela oficial, com fonte e data em benchmark-references.json. Não verifica o resultado informado, não executa nem publica Geekbench automaticamente, e não mistura as pontuações com o microteste local. Não é ranking mundial ou de computadores completos.

Validação: nove testes automatizados; diagnóstico e melhoria executados localmente. Nesta máquina o reparo foi corretamente ignorado por reinício pendente; verificação de integridade, DNS, energia, inventário e medições concluíram. A medição após o fluxo foi inferior à anterior, mostrando a variação real sem mascará-la.
