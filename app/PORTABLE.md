# Vimaka Care — Linux e macOS (prévia)

Esta edição portátil reaproveita o dashboard da versão Windows. Inclui diagnóstico de hardware e interfaces de rede, benchmark local, relatório e busca de arquivos/pastas grandes. Não instala serviços e não executa ajustes automáticos no Linux/macOS.

## Plataformas

- Linux: prioridade Ubuntu/Debian e Fedora/RHEL, desktop e estações corporativas. Inventário de pacotes via dpkg ou RPM. Outras distribuições ainda não validadas.
- macOS: Intel e Apple Silicon. A lista de aplicativos cobre /Applications e ~/Applications, sem calcular o tamanho dos bundles.
- Requer Node.js 22 ou superior; recomendamos Node.js 24 LTS. Com Node 24, macOS 13.5 ou posterior. Use a versão do Node compatível com sua arquitetura e seu sistema.

## Abrir

1. Instale o Node.js LTS pelo site oficial https://nodejs.org, se necessário. Ele executa o componente local; o pacote não baixa dependências nem solicita senha administrativa automaticamente.
2. Extraia o arquivo tar.gz em uma pasta de sua conta.
3. Abra o Terminal nessa pasta e execute `sh ./Start-Vimaka.command`.
4. A interface abrirá em http://127.0.0.1:47831. Mantenha o Terminal aberto. Para encerrar, use o botão do aplicativo ou Ctrl+C.

Não é necessário executar `npm install` para usar o pacote. As dependências npm são usadas somente nos testes de desenvolvimento. Não execute como root. Em computadores administrados, siga a política de instalação da empresa.

## Limitações da prévia

- Inicialização: inventário parcial de autostart no Linux e LaunchAgents no macOS; não inclui todos os serviços/login items.
- Memória: memória livre informada pelo sistema, diferente da memória disponível; cache pode ser reaproveitado pelo SO.
- GPU, tamanho de aplicativos macOS e ajustes de energia não são coletados/aplicados.
- A análise de disco é limitada e pode omitir itens sem permissão, links e diretórios virtuais/montados. Não remove arquivos.
- Benchmark local é um microteste; não representa uma pontuação Geekbench. A comparação Geekbench continua opcional e exige resultados do mesmo teste/versão.
- Pacote portátil, sem instalador .deb/.rpm/.dmg e sem assinatura/notarização Apple. Testes automatizados não substituem a validação visual em máquinas reais.

Os dados ficam em ~/.local/share/vimaka-care (ou XDG_DATA_HOME/vimaka-care) no Linux e ~/Library/Application Support/VimakaCare no macOS. Relatórios podem conter nomes/caminhos locais: revise antes de compartilhar.
