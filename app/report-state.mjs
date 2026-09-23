export function recordReport(comparison,job){
 const report={jobId:job.id,mode:job.mode,at:new Date().toISOString(),before:job.before||null,after:job.after||null,benchmarkBefore:job.benchmarkBefore||null,benchmarkAfter:job.benchmarkAfter||null,steps:(job.steps||[]).filter(s=>s.id!=='report').map(s=>({...s}))};
 comparison.lastReport=report;
 if(job.mode==='performance')comparison.performanceReport=report;
 if(job.mode==='diagnostic')comparison.diagnosticReport=report;
 return comparison;
}
