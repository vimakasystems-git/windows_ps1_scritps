# Windows Care 0.4.0-preview.1 — escopo e validação

Atualização de 02/10/2026 baseada no documento `REQUISITOS_CODEX_WINDOWS_CARE.md` fornecido pelo proprietário. A especificação é uma referência de produto; resultados, suporte e testes abaixo descrevem o que existe, sem tratar pedidos do documento como evidência de implementação. Esta entrega concentra a Fase 1. Não representa a conclusão das Fases 2 e 3 nem uma liberação de produção.

## Gratuito e pago

| Gratuito | Pacote completo — R$ 19,99 por computador |
|---|---|
| Cinco jornadas de diagnóstico, evidências, hipóteses e orientação local por sintoma | Análise aprofundada de hardware, drivers e eventos disponíveis |
| Inventário básico, benchmark, armazenamento e consulta de drivers | Linha do tempo ampliada de até sete dias/240 eventos selecionados |
| Procedimentos elegíveis, confirmação específica, diário e revalidação | Relatórios avançados/técnicos, inventário e documentação, HTML imprimível em PDF |
| Recuperação e reversão suportada, mesmo sem licença ou após expiração | Download e instalação/atualização assistida de drivers oficiais suportados; configuração pelo Windows/assistente OEM |
| Controle de conteúdo opcional, resumo e imagem para compartilhar | Inclui todos os recursos gratuitos |

O servidor aplica as permissões, além de identificá-las na interface. Não há cobrança por defeito encontrado, liberação condicionada de reversão ou diagnóstico básico dependente de IA. O Pix tem valor fixo; a conferência do recebimento e a emissão da licença são manuais. O proprietário ainda precisa definir prazo, validade técnica e suporte na oferta. Não foi inventada assinatura recorrente ou licença vitalícia. O vínculo técnico inicial usa o identificador local da instalação; não é DRM inviolável nem gestão centralizada de ativações.

## Matriz de implementação

| Requisito | Situação anterior / lacuna | Prioridade | Implementação e estado | Evidência de validação / limite |
|---|---|---|---|---|
| Coletores, regras e procedimentos separados | Inventário e comandos pouco relacionados | P0 | `Collect-Evidence.ps1`, `diagnosis.mjs`, catálogo, motor e API separados | Coleta real somente leitura; testes das regras e API |
| Achados com evidência, hipótese e confiança | Recomendações gerais | P0 | Cinco categorias de achado, horário, testes e ações elegíveis | Ausência de dados não vira defeito; evento isolado não vira alerta crítico |
| Inicialização lenta | Lista e tela do Windows | P0 | Eventos de boot, três amostras de desempenho, revisão de uma entrada HKCU Run; backup DPAPI verificado e reversão com detecção de conflito | Regras e estados testados; alteração/restauração nativa ainda requer VM. Não cobre serviços/tarefas nem prova causa pelo número de entradas |
| Windows Update | Abertura de painel / reparo genérico | P0 | Falhas selecionadas, serviços, reinício, repetição de consulta WUA e início de wuauserv parado | Recusa domínio, política gerenciada ou serviço desabilitado; consulta não comprova instalação. Cenários reais de falha aguardam VM |
| Aplicativos travando | Monitor de Confiabilidade | P0 | Eventos selecionados, ocorrência versus hipótese, opções oficiais de reparo, teste humano registrado | Sem redefinir app nem apagar dados automaticamente; não há solucionador universal de dependências |
| Rede | Inventário básico | P0 | DHCP, DNS, VPN/proxy, sondagem opt-in, amostras de latência/perda | Não redefine rede; ICMP bloqueado é hipótese. Não atribui automaticamente falha ao provedor |
| Integridade | DISM/SFC em lote | P0 | DISM ScanHealth, SFC VerifyOnly; RestoreHealth apenas após Repairable e confirmação de backup externo; nova verificação | Estados desconhecidos permanecem pendentes; SFC interpretado em pt/en; reparo real e reinício aguardam VM |
| Catálogo versionado e parâmetros tipados | Ações fixas sem diário específico | P0 | Impacto, privilégio, alterações, pré-condições, backup, cancelamento, validação e limites por ação | Testes recusam comandos arbitrários, parâmetros extras, entrada protegida e diagnóstico vencido |
| Persistência e recuperação | Histórico de tarefas | P0 | Diário atômico por operação, estados explícitos, interrupção sem repetição, mutex nativo, exclusão de concorrência | Injeção de falhas de backup/diário/timeout/concorrência; recuperação gratuita. Queda real de energia não ensaiada |
| Reversão | Restauração do plano de energia anterior | P0 | Preserva recuperação antiga e acrescenta HKCU Run com DPAPI e comparação do valor/tipo | Não promete reverter DISM, instalação de drivers ou mudanças manuais feitas no Windows |
| Sintoma em linguagem natural | Link externo para assistente | P1 | Roteamento determinístico local por palavras do sintoma | Não é LLM, não conclui causa e não envia dados para IA |
| Progresso e explicação | Etapas gerais | P0 | Barra superior por item da coleta e etapas do procedimento; estados pendentes explícitos | Percentual indica etapas concluídas, não tempo restante nem sucesso do reparo |
| Benchmark e consumo próprio | Microbenchmark local | P1 | Mantém medições reais; coleta CPU/memória/disco três vezes e registra custo do coletor | Não é benchmark de jogos/GPU; comparação não garante aceleração; orçamento abaixo |
| Relatórios e planos | Avançado/técnico e Pix já iniciados | P0 | Comparação de planos, validação no servidor, diagnóstico e diário no relatório técnico | Assinatura, expiração, máquina, Pix e exportação cobertos por testes; PDF via impressão |
| Drivers e fabricantes | Seis fabricantes com EXE assistido | P1 | Adiciona nove portais, incluindo Positivo e marcas/linhas asiáticas, conforme tabela abaixo | Portais não equivalem a instalação automática. Nenhum driver foi instalado nesta máquina para teste |
| Conteúdo e redes sociais | Recursos do update comercial | P1 | Opt-in reversível de categorias e resumo/imagem revisáveis | Hosts parcial, sem garantia de filtragem completa; publicação manual em Facebook, LinkedIn, Instagram e TikTok |
| Privacidade / privilégio mínimo | App local, elevação pontual | P0 | Eventos sem mensagens integrais, sem comandos de inicialização no diagnóstico, backup sensível DPAPI | Dados comuns no perfil do usuário; helper/pacote ainda sem certificado próprio de produção. Endurecimento de IPC/ACL e auditoria de segurança pendentes |
| Instalação e atualização | Instalador e runtime empacotados | P0 | Prévia compilável, aceite de termos e licença preservado; módulos novos incluídos nos três empacotadores | Build e teste do payload; instalação/recusa/atualização/desinstalação interativas requerem VM antes da produção |
| Hardware/periféricos/prevenção aprofundados | Inventário parcial e painéis | P2 | Alguns contadores disponíveis na análise paga; expansão permanece na Fase 2 | Sem diagnóstico físico completo, previsão de falha ou teste automático de periféricos |
| IA remota, recuperação offline e gestão de máquinas | Não existentes | P2/P3 | Não implementados nesta entrega | Sem controles que prometam operações inexistentes |

## Fabricantes

| Fabricante | Escopo nesta prévia | Portal oficial |
|---|---|---|
| Intel / NVIDIA / AMD | EXE HTTPS de hosts permitidos, conferência do dispositivo, SHA-256 e Authenticode; assistente oficial | [Intel](https://www.intel.com/content/www/us/en/support/detect.html), [NVIDIA](https://www.nvidia.com/en-us/drivers/), [AMD](https://www.amd.com/en/support/download/drivers.html) |
| Dell / HP / Lenovo | Mesmo fluxo, compatibilidade com OEM confirmada pelo usuário | [Dell](https://www.dell.com/support/home/en-us?app=drivers), [HP](https://support.hp.com/us-en/drivers), [Lenovo](https://pcsupport.lenovo.com/us/en/) |
| Positivo | Portal por número de série; sem importação automática de pacote | [Positivo](https://www.meupositivo.com.br/para-voce/suporte-tecnico/drivers) |
| ASUS / Acer / MSI / Gigabyte | Portal por modelo/revisão/região; instalador ou ZIP conforme fabricante | [ASUS](https://www.asus.com/support/download-center), [Acer](https://www.acer.com/gb-en/support/drivers-and-manuals), [MSI](https://www.msi.com/support/download), [Gigabyte](https://www.gigabyte.com/Support/Consumer/Download) |
| Samsung / Huawei / Dynabook–Toshiba / LG | Portal oficial e utilitário OEM quando exigido | [Samsung](https://www.samsung.com/us/support/downloads/), [Huawei](https://consumer.huawei.com/cn/support/driver-list/), [Dynabook](https://support.dynabook.com/drivers), [LG](https://www.lg.com/us/support/software-firmware-drivers) |

São fabricantes relevantes solicitados para ampliar a cobertura; não é um ranking comprovado de participação de mercado na Ásia. Drivers continuam sujeitos às licenças dos fabricantes. Não há catálogo universal, download em agregadores, BIOS/firmware ou garantia de cobertura de todo modelo.

## Compatibilidade, consumo e limites

Procedimentos novos de alteração e integridade: Windows 11 cliente x64, build mínima 26100, edições Core, CoreSingleLanguage, Professional, ProfessionalEducation, ProfessionalWorkstation, Enterprise e Education. É um alvo de implementação experimental, não uma certificação de todas as builds futuras. Windows Server, ARM64, Windows 10 e Windows 11 anteriores permanecem fora desse conjunto. Diagnóstico limitado e reversão suportada permanecem acessíveis. Mac/Linux mantêm as funções portáteis anteriores; jornadas nativas do Windows não são oferecidas nesses sistemas.

O suporte depende da edição e versão: [ciclo de Windows 11 Home/Pro](https://learn.microsoft.com/en-us/lifecycle/products/windows-11-home-and-pro). Na consulta de 02/10/2026, 24H2 Home/Pro termina em 14/10/2026; não se deve prometer suporte indefinido apenas pela build mínima. O computador de teste estava em Windows 11 Pro 21H2/build 22000; foi usada apenas coleta, sem tentar atualizá-lo ou repará-lo.

Referência real de coleta sob demanda: 20.513 ms, 115,8 MiB de memória residente ao final e 7,42 segundos de CPU do processo PowerShell. É uma amostra, não pico de memória ou benchmark generalizável. Limites: três amostras de desempenho, oito processos por memória, cinco boots, até 60 eventos básicos ou 240 ampliados, quatro pings por destino somente com consentimento, timeout externo de 180 segundos. Orçamento provisório de investigação: comparar novas coletas com essa referência, investigar execuções acima de 60 segundos ou 256 MiB; não há limitador rígido de RAM. Não há coleta pesada contínua ou serviço de monitoramento na inicialização. Timeout de manutenção não autoriza repetição automática: o diário exige revisão.

Fontes técnicas: [DISM](https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/repair-a-windows-image?view=windows-11), [Repair-WindowsImage](https://learn.microsoft.com/en-us/powershell/module/dism/repair-windowsimage?view=windowsserver2025-ps), [SFC](https://support.microsoft.com/en-us/windows/experience/backup-recovery/use-the-system-file-checker-tool-to-repair-missing-or-corrupted-system-files). Referências legais, Pix e padrão comercial estão em `app/COMMERCIAL-READINESS.md`.

## Validação e entrega

Suíte local: 45 testes, 44 aprovados, um teste de plataforma portátil ignorado no Windows. Inclui recusa nativa de driver adulterado/sem assinatura, regras, permissões, estados e recuperação com dependências controladas. Scripts PowerShell analisados sintaticamente. Coleta real das seis áreas disponível; navegação de planos e fabricantes verificada no navegador local. O pacote não foi instalado sobre o Windows do usuário, e não foram executados DISM de reparo, remoção de inicialização, instalação de driver ou bloqueios durante desenvolvimento.

Antes de uma release de produção: VM descartável por versão/edição suportada; aceite e recusa do instalador; UAC aceito/negado; backup inacessível/adulterado; falha e conflito de restauração; internet ausente; manutenção longa/interrompida; reinício pendente e pós-reinício; comparação de três boots equivalentes; falha real de Update/app; driver por fabricante; bloqueio e reversão de hosts; atualização e desinstalação preservando dados. Certificado de assinatura legítimo e oferta comercial completa continuam dependências. Estes itens não foram marcados como aprovados por testes simulados.
