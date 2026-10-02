# Preparação comercial e pesquisa — 2 de outubro de 2026

Implementação: aceite obrigatório no instalador Windows (inclusive com --accept-install) e aceite versionado local no primeiro uso. Reparos mantêm sua confirmação por operação. Convites sociais são voluntários, sem publicar ou verificar seguidores. Relatório social usa apenas medições emparelhadas da mesma execução e não inclui inventário pessoal.

Referências consultadas:
- Lei 9.609/1998, arts. 7–9: licença, validade técnica e suporte: https://www.planalto.gov.br/ccivil_03/leis/l9609.htm
- CDC, arts. 25 e 51: limites de exclusão de responsabilidade; arts. 30, 31 e 49: oferta, informação e arrependimento quando aplicável: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- LGPD, consentimento específico e finalidades, quando aplicável: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- Padrão de mercado observado: contrato de licença, escopo de uso, planos e limitações: https://www.ccleaner.com/pt-br/legal/end-user-license-agreement
- Pix estático e normalização da chave de telefone: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
- Listas por categoria, licença Unlicense: https://github.com/blocklistproject/Lists

O texto dos termos é uma minuta operacional a revisar juridicamente antes da comercialização. Não oferece isenção absoluta por defeitos do software. Direitos obrigatórios do consumidor são preservados.

## Planos e operação

Avançado: inventário, aplicativos, armazenamento, drivers, atualizações, erros recentes, contadores de disco disponíveis, bateria, microbenchmark, achados e recomendações. Técnico acrescenta evidências das execuções e status de cada etapa. HTML exportado pode ser impresso em PDF. Dados indisponíveis e limitações ficam explícitos; não há promessa de diagnóstico físico completo.

Preço definido: R$ 19,99 por computador, pacote completo. Prazo de licença, suporte e validade técnica ainda precisam constar da oferta. A interface mostra o preço e o Pix e exige licença assinada emitida após confirmação manual do pagamento. O QR Pix usa a chave +5511945546072, Douglas Cardoso, São Paulo, com valor fixo de R$ 19,99; não há integração bancária nem confirmação automática.

Ativação: configure somente a chave pública Ed25519 em public/commerce.json. Guarde a chave privada fora do repositório e do pacote. Para o pacote completo, emita com `node issue-license.mjs /caminho/privada.pem IDENTIFICADOR technician DATA-ISO`, usando o vencimento informado na oferta. Verificação exige assinatura, produto, plano, identificador local e validade. O identificador local constitui a vinculação técnica inicial, não uma decisão sobre a abrangência comercial. Como qualquer app distribuído com código local, não oferece DRM inviolável.

## Controle de conteúdo

Desativado por padrão. O usuário seleciona malware/phishing, pornografia e/ou apostas e confirma sua autorização. Download HTTPS das listas de origem fixa no GitHub somente ao aplicar. Validação e limites interrompem alterações em caso de erro. O Windows pede elevação. As entradas ficam em bloco identificado no hosts; reversão remove somente esse bloco, preserva outras entradas e limpa cache DNS. Não usa monitoramento de navegação. Afeta todos os usuários e não cobre automaticamente subdomínios, VPN, acesso por IP ou novos domínios. Reaplique para atualizar listas. Listas originais somam milhões de entradas. Esta implementação usa somente os primeiros 5 mil domínios válidos por fonte (lista parcial), além de entradas iniciais; não equivale a um serviço completo de filtragem. Pode haver falsos positivos. Backups são preservados junto ao hosts.

## Publicação

Esta alteração não muda a versão comercial nem publica release. Antes de disponibilizar instalador final: completar condições comerciais, revisar a minuta, preservar a chave privada de emissão e validar instalação/recusa, elevação, bloqueio/reversão e relatório licenciado em máquina virtual. Não foram executados reparos nem bloqueios na máquina de desenvolvimento.

## Drivers oficiais — implementação assistida

Diagnóstico gratuito: versões instaladas, fornecedor, assinatura informada pelo Windows, dispositivos com erros e ofertas de drivers pelo Windows Update Agent. A consulta requer autorização online e informa falha/parcialidade; ausência de oferta não significa catálogo OEM atualizado.

Serviço pago (pacote completo R$ 19,99/computador): usuário seleciona dispositivo inventariado e confere compatibilidade no portal OEM ou Intel/NVIDIA/AMD/Dell/HP/Lenovo. Informa link EXE direto do domínio oficial suportado. Download e redirecionamentos ficam na lista de domínios do fabricante, limite 2 GiB, hash SHA-256 local e Authenticode válido do fabricante. Não há agregadores. O hash detecta alteração posterior, não substitui a assinatura.

Instalação exige licença válida e consentimento separado. A assinatura e o hash são conferidos novamente antes de abrir o assistente oficial, sem parâmetros silenciosos. Configuração abre o Gerenciador de Dispositivos ou o próprio assistente; usuário escolhe e confirma configurações. Não há ajustes genéricos automáticos de drivers. O app registra versões antes/depois, mudanças observadas, código de saída e necessidade de reinício. Quando o assistente encerra sem mudança observada ou usa processo separado, informa verificação necessária; o usuário repete o diagnóstico. Não reinicia, força downgrade, instala BIOS/firmware ou promete detectar atualizações de todos os fabricantes. Fabricantes não suportados exigem fluxo manual pelo portal oficial.

Referências: https://learn.microsoft.com/en-us/windows/win32/api/wuapi/nf-wuapi-iupdatesearcher-search ; https://www.intel.com/content/www/us/en/support/detect.html ; https://www.nvidia.com/en-us/drivers/ ; https://www.amd.com/en/support/download/drivers.html ; https://www.dell.com/support/home/en-us?app=drivers .

A chave pública é distribuída no pacote. A chave privada de emissão fica exclusivamente em outputs/Vimaka-license-private.pem neste workspace e não é enviada ao GitHub ou aos instaladores. Preserve-a e restrinja o acesso. Pix não é confirmado automaticamente.
