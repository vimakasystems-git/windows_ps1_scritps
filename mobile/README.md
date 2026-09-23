# Vimaka Workstation Care Mobile — 0.1.0 preview

O desenvolvimento mobile está focado em **celulares e tablets Android**, independente do servidor Node desktop. iPhone/iPad estão fora do escopo atual; o projeto experimental Apple foi preservado apenas como referência, sem novos builds ou distribuição.

- Dashboard e relatório local. O aplicativo Android informa bateria, capacidade de armazenamento, memória física total e processadores lógicos disponíveis pelas APIs públicas.
- Microbenchmark JavaScript com histórico no próprio dispositivo. Não usa a escala desktop nem Geekbench; comparar somente neste aparelho, navegador/engine e protocolo.
- Arquivos escolhidos pelo usuário: ordenação por tamanho, até 50 maiores; sem upload, leitura do conteúdo ou exclusão.
- Português, inglês e espanhol; layout adaptável a tablets.
- Acesso ao ecossistema Vimaka e Cérebro Brasil no navegador externo.

Não limpa memória de outros apps, não encerra processos, não varre todo o armazenamento e não altera configurações do SO. O sistema pode limitar ou não fornecer dados. No navegador, memória/bateria/armazenamento nativos aparecem como não medidos.

## Usar

Web/PWA: https://vimakasystems-git.github.io/windows_ps1_scritps/

No Android use o menu do navegador para instalar a PWA, ou baixe o APK de testes na release mobile. A versão web tem as limitações de dados do navegador.

O APK é uma **prévia de testes, assinada com chave de desenvolvimento**, não uma versão de produção/Play Store. A chave de desenvolvimento dos runners não é persistente: builds de teste posteriores podem exigir reinstalação e perder o histórico local. A distribuição definitiva exige configurar uma chave de assinatura persistente mantida fora do repositório.


Android: mínimo Android 8 (API 26), WebView atualizado. Sem permissão de acesso amplo a arquivos ou inventário de outros aplicativos. Usa o seletor de arquivos do sistema.

## Código e testes

- `mobile/www`: interface web compartilhada; nenhum endpoint do servidor desktop.
- `platforms/android`: projeto Android Java/WebView, Gradle 8.11.1 / AGP 8.10.1.
- `node --test mobile/tests/*.cjs`: ordenação, comparabilidade e medição.
- GitHub Actions compila somente Android e executa teste em emulador. Testes em emulador não substituem validação em celulares e tablets reais.

As versões mobile usam releases `mobile-*` separadas. Não substituem a release estável dos instaladores desktop. O app nativo inclui os arquivos web; alterações do site não atualizam automaticamente APK. A PWA recebe seus arquivos por HTTPS e guarda o shell em cache para uso offline após o primeiro acesso.

Relatórios podem conter nomes de arquivos selecionados. Revise antes de compartilhar. O histórico fica no armazenamento local do app/navegador e pode ser removido ao limpar dados ou desinstalar.
