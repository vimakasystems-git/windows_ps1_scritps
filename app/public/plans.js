export const features = Object.freeze([
 {id:'diagnostics',name:'Diagnóstico das cinco jornadas com evidências e hipóteses',plan:'free'},
 {id:'symptoms',name:'Orientação local por sintoma, sem envio à nuvem',plan:'free'},
 {id:'measurements',name:'Inventário, benchmark, armazenamento e diagnóstico de drivers',plan:'free'},
 {id:'safeRepairs',name:'Reparos do catálogo com confirmação e validação posterior',plan:'free'},
 {id:'recovery',name:'Histórico, revalidação e reversão suportada, mesmo após expirar a licença',plan:'free'},
 {id:'contentControl',name:'Controle opcional de conteúdo e compartilhamento voluntário',plan:'free'},
 {id:'basicReport',name:'Resumo básico do computador e dos achados',plan:'free'},
 {id:'advancedAnalysis',name:'Análise aprofundada de hardware, drivers e eventos',plan:'paid'},
 {id:'extendedTimeline',name:'Linha do tempo ampliada de até 7 dias e correlações',plan:'paid'},
 {id:'professionalReport',name:'Documentação completa e relatórios avançados/técnicos em HTML/PDF',plan:'paid'},
 {id:'driverService',name:'Download, instalação, configuração e atualização assistida de drivers oficiais',plan:'paid'}
]);
export function featureAllowed(id,license){const feature=features.find(f=>f.id===id);return !!feature&&(feature.plan==='free'||!!license);}
