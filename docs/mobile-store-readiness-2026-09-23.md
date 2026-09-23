# Auditoria de preparação para lojas — 23/09/2026

**Resultado: NÃO PRONTO para submissão à Google Play ou App Store.** Esta auditoria técnica não é certificação das lojas nem parecer jurídico. Apple foi avaliada a pedido, sem reativar seu desenvolvimento. Escopo: mobile 0.1.0-preview; código e configuração no commit 7b36a21; binários produzidos em e24aba2. Os instaladores desktop não fazem parte desta análise.

## Evidências e testes

- Executado novamente: `node --test mobile/tests/mobile.test.cjs`: 3/3 passaram (ordenação de metadados, compatibilidade entre benchmarks e medição/progresso).
- APK examinado com Android build-tools 36.0.0: `aapt dump badging`, `aapt dump permissions` e `apksigner verify --print-certs`.
- APK: `com.vimaka.workstationcare.mobile.preview`, versão 0.1.0-preview, versionCode 1, minSdk 26, targetSdk 35, **debuggable**, certificado **CN=Android Debug**. Assinatura tecnicamente válida, mas não apropriada para publicação.
- Manifesto final não declara permissões; não há bibliotecas `.so` empacotadas. Não foram encontrados SDKs de publicidade ou analytics no código revisado. Isso não equivale a uma auditoria dinâmica de tráfego.
- Testes nativos anteriores passaram em [CI 35822670490](https://github.com/vimakasystems-git/windows_ps1_scritps/actions/runs/35822670490): Android verifica diagnóstico e benchmark; iPhone/iPad verificam benchmark e abertura do relatório. Não foram repetidos neste levantamento, pois o código do aplicativo não mudou.
- Não realizados: aparelhos físicos, acessibilidade TalkBack/VoiceOver, ciclo de vida/rotação, arquivos fornecidos por múltiplos provedores, teste nativo em tablet Android, Play pre-launch report, validação App Store Connect ou auditoria de todas as páginas externas.
- APK SHA-256: `b59b4ed632cc71fb2545183db22ab79b69474bb072acfaaf54d578308a97e00a`.
- ZIP iOS simulador SHA-256: `dbadba072329343e18d109a3d1031f8101fc6629f619e55e2511622db26c4514`.

## Bloqueios e pendências

| Prioridade | Plataforma | Evidência | Ação necessária |
|---|---|---|---|
| Bloqueio | Android | `platforms/android/app/build.gradle`: targetSdk 35; confirmado no APK | Migrar para API 36 e testar as mudanças de comportamento, incluindo insets, navegação e telas grandes. A regra vigente desde 31/08/2026 exige API 36 para novos apps/updates, salvo exceção aplicável confirmada na Console. |
| Bloqueio | Android | CI usa assembleDebug; artefato é debuggable e usa Android Debug | Gerar AAB release, configurar upload key persistente e Play App Signing, proteger a chave fora do Git e testar o pacote release. |
| Bloqueio | Ambas | `mobile/www/index.html` não oferece política de privacidade; o aviso sobre nomes de arquivos não é uma política | Publicar política acessível e específica, informar responsável/contato, dados acessados, uso, retenção/exclusão e serviços externos; incluir acesso dentro do app e na ficha da loja. |
| Bloqueio | Apple | ZIP é somente simulador; sem arquivo de distribuição para dispositivo | Configurar equipe, assinatura/provisionamento e arquivo de distribuição validado; atender ao SDK exigido na data do envio. Apple permanece fora do desenvolvimento atual. |
| Bloqueio | Apple | `Sources/App.swift` consulta capacidade do disco; não existe PrivacyInfo.xcprivacy no projeto nem no ZIP | Declarar a categoria de API e a justificativa aprovada correspondente ao uso real; validar o relatório de privacidade do archive. Não adicionar razões genéricas sem conferir elegibilidade. |
| Bloqueio | Apple | Sem catálogo AppIcon/Assets.car no pacote inspecionado | Configurar ícone de distribuição e validar recursos/metadata no archive. O logo dentro da página não substitui o ícone da loja. |
| Não verificado | Ambas | Sem acesso/verificação das fichas nas consoles | Completar Data safety/App Privacy, público-alvo, classificação etária, suporte, descrição e screenshots reais. Validar identidade/conta, direitos de marca e requisitos contratuais. Não declarar “sem coleta” só pela ausência de permissões. |
| Condicional | Google Play | Tipo/data da conta desconhecidos | Contas pessoais criadas após 13/11/2023 precisam do teste fechado com pelo menos 12 participantes inscritos continuamente por 14 dias e solicitação de acesso à produção. CI não substitui esse processo. |
| Risco de revisão | Ambas | Dashboard simples, microbenchmark, seletor e links externos em WebView | Demonstrar utilidade própria e completa. WebView não é automaticamente proibida, mas funcionalidade limitada ou app predominantemente promocional pode ser recusado. A avaliação final é da loja. |
| Qualidade não comprovada | Android/tablet | Teste Android atual não cobre picker, relatório, rotação, retorno do background, TalkBack ou navegação por gestos | Ampliar testes de fluxos reais e executar matriz de celular/tablet com API mínima e atual, no build release. |

## Pontos favoráveis observados

O app usa seletor de documentos, sem acesso amplo a arquivos ou inventário de apps. Processa metadados selecionados localmente. Preferência de idioma e até dez resultados de benchmark ficam em localStorage. Não há conta de usuário no app revisado. Nenhum mecanismo nativo de autoatualização externa foi encontrado; o link de versões abre o navegador. Não há cobrança, Pix ou SDK de anúncios no mobile revisado. As regras de pagamentos precisarão de nova avaliação se esses recursos forem adicionados.

Os textos avisam que o microbenchmark não é Geekbench/ranking mundial e que o app não limpa RAM de outros apps nem acelera a internet. Esses limites devem permanecer nas descrições comerciais. Links externos abrem outros serviços: suas práticas e o tráfego da hospedagem PWA devem ser considerados nas declarações de privacidade. Não é apropriado copiar automaticamente as declarações do APK para a PWA.

## Ordem recomendada para Android

1. Resolver API-alvo, privacidade e empacotamento/assinatura de produção.
2. Definir o identificador definitivo antes de publicar e documentar a migração da preview.
3. Testar release em celulares e tablets, incluindo arquivos, navegação, acessibilidade, erros e persistência.
4. Preencher e verificar a Play Console, realizar teste interno/fechado aplicável e revisar o pre-launch report.
5. Somente então solicitar análise da loja. Não rotular a preview como “full compliance”.

## Fontes oficiais consultadas

- [Google Play: API-alvo](https://developer.android.com/google/play/requirements/target-sdk)
- [Android: preparar release e assinatura](https://developer.android.com/studio/publish/preparing)
- [Google Play: privacidade e dados](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Google Play: requisitos de teste para contas pessoais](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Google Play: funcionalidade e experiência](https://support.google.com/googleplay/android-developer/answer/9898783)
- [Apple: App Review Guidelines, em especial 2.1, 4.2 e 5.1.1](https://developer.apple.com/app-store/review/guidelines/)
- [Apple: declarações de APIs com justificativa obrigatória](https://developer.apple.com/documentation/technotes/tn3183-adding-required-reason-api-entries-to-your-privacy-manifest)
- [Apple: preparação de submissão](https://developer.apple.com/app-store/submitting/)

As políticas mudam. Revalidar fontes e consoles na data efetiva de submissão. Não foi enviada candidatura às lojas nem alterada a configuração de produção nesta auditoria.
