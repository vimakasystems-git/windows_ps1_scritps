import crypto from 'node:crypto';
export const termsVersion='2026-10-02.1';
export function requireConsent(record){if(record?.version!==termsVersion||record.terms!==true||record.license!==true)throw Error('Leia e aceite os termos e a licença antes de executar.');}
export function verifyLicense(token,key,installation){
 try{const [payload,signature,...extra]=String(token).split('.');if(extra.length||!key)return null;
 if(!crypto.verify(null,Buffer.from(payload),key,Buffer.from(signature,'base64url')))return null;
 const claim=JSON.parse(Buffer.from(payload,'base64url'));if(claim.product!=='vimaka-care'||claim.installation!==installation||!['advanced','technician'].includes(claim.plan)||!Number.isFinite(Date.parse(claim.expires))||Date.parse(claim.expires)<=Date.now())return null;return claim;
 }catch{return null;}
}
export function professionalReport(comparison,inventory,jobs,profile){
 if(!comparison.current)throw Error('Execute um diagnóstico antes de gerar o relatório.');
 const c=comparison.current,findings=[];
 if(c.restartPending)findings.push({priority:'alta',evidence:'Reinicialização pendente',recommendation:'Reinicie antes de reparar novamente.'});
 if(Number.isFinite(c.freeGB)&&c.freeGB<2)findings.push({priority:'atenção',evidence:'Memória disponível abaixo de 2 GB nesta leitura',recommendation:'Revise a carga e os aplicativos; repita em condições equivalentes.'});
 for(const drive of c.drives||[]){if(drive.totalGB>0&&drive.freeGB/drive.totalGB<0.1)findings.push({priority:'atenção',evidence:`Unidade ${drive.name}: menos de 10% livre`,recommendation:'Revise arquivos grandes antes de remover dados.'});}
 return {schema:1,profile,generatedAt:new Date().toISOString(),inventory:c,installedPrograms:inventory.programs,storage:inventory.roots,comparison,findings,...(profile==='technician'?{executionEvidence:jobs.map(j=>({title:j.title,status:j.status,steps:j.steps,at:j.at,finishedAt:j.finishedAt}))}:{}),documentation:{method:'Inventário local, configuração de armazenamento, aplicativos registrados, microbenchmark e evidências das operações. Sem teste físico de componentes.',limitations:['Não mede saúde física completa ou tempo de boot.','Ausência de achados não comprova ausência de defeitos.','Variações de carga e temperatura afetam resultados.'],nextSteps:['Faça backup dos dados antes de reparos.','Investigue falhas de hardware com ferramentas do fabricante.','Compare medições sob carga equivalente.']}};
}
export function shareSummary(comparison){
 const report=comparison.performanceReport,before=report?.benchmarkBefore?.cpuSha256MiBs,after=report?.benchmarkAfter?.cpuSha256MiBs;
 const measured=Number.isFinite(before)&&before>0&&Number.isFinite(after)&&!report.steps?.some(s=>s.status==='failed');
 return 'Meu computador foi avaliado com Vimaka Workstation Care. '+(measured?`Microbenchmark SHA-256 em uma thread: ${before.toFixed(1)} → ${after.toFixed(1)} MiB/s (${((after/before-1)*100).toFixed(1)}% nesta medição). `:'Diagnóstico local do computador. ')+'Não representa aceleração geral. Resultados variam conforme o equipamento e a carga. https://github.com/vimakasystems-git/windows_ps1_scritps';
}
