# Vimaka Workstation Care 0.3.0

Dashboard local com diagnóstico, benchmark, análise de armazenamento e relatórios. Windows inclui reparos específicos; Linux/macOS oferecem diagnóstico e análise, sem tuning automático.

## Instalação

Os instaladores incluem Node.js: não é necessário instalar Node separadamente.

- Windows x64: instalador .exe, por usuário, preservando dados da edição Vimaka Windows Care. Mantém a pasta interna legada para permitir atualização.
- Ubuntu/Debian: .deb x64 ou ARM64. Instale pelo gerenciador de aplicativos ou `sudo apt install ./arquivo.deb`.
- Fedora/RHEL: .rpm x64 ou ARM64. Use o gerenciador gráfico ou `sudo dnf install ./arquivo.rpm`.
- macOS Intel/Apple Silicon: .pkg da arquitetura correspondente. Instala o app em /Applications; exige macOS 13.5+. Pacote sem assinatura/notarização Apple.

Linux instala em /opt/vimaka-workstation-care e adiciona um item ao menu de aplicativos. Linux/macOS exigem autorização administrativa na instalação; o aplicativo deve ser aberto com a conta normal. A interface abre no navegador padrão. O componente local pode ser encerrado pelo botão no rodapé.

## Atualizações

Use **Verificar atualização → Baixar atualização → Abrir instalador**. O aplicativo consulta exclusivamente a última release estável de vimakasystems-git/windows_ps1_scritps. Seleciona OS/arquitetura e família DEB/RPM, confere tamanho e SHA-256 fornecido pelo GitHub e abre o instalador. Linux depende do gerenciador gráfico associado ao pacote; se ele abrir como arquivo, instale o pacote baixado pelo gerenciador da distribuição. Não há instalação silenciosa nem coleta de senha.

Não se instalam versões anteriores/pré-releases, arquivos de outro repositório ou outra arquitetura. A release deve conter todos os instaladores antes de ser publicada. Os arquivos ficam em Releases; cada pasta platforms documenta o nome esperado. Relatórios e histórico ficam fora da pasta de programa e são preservados.

O código está em app/. Empacotadores separados em platforms/windows, platforms/linux e platforms/macos; o empacotador POSIX compartilhado é platforms/build-installers.py.

## Limitações

O benchmark local não corresponde à escala Geekbench. Inventário Linux/macOS é parcial (sem GPU, todos os itens de login ou tamanho dos apps macOS). Não são garantidos ganhos de desempenho. As distribuições alvo são Ubuntu/Debian e Fedora/RHEL; Ubuntu e Fedora recebem testes automatizados, Debian/RHEL ainda precisam de homologação específica.

O instalador Windows não possui assinatura do desenvolvedor e pode exibir SmartScreen. O pacote macOS ainda precisa de certificados Developer ID e notarização para distribuição sem avisos. O checksum protege a integridade do download, não substitui assinatura do desenvolvedor.

Para desenvolvimento: Node 22+, npm ci, npm test, npm start. Os testes não executam reparos do sistema. Nunca publique relatórios locais contendo nomes/caminhos privados.
