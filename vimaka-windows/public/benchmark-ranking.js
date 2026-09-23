export function rankScore(score,references){
 if(!Number.isFinite(score)||score<=0||score>100000)throw Error('Informe uma pontuação válida do Geekbench 7 CPU Single-Core.');
 return [...references.map(x=>({...x,local:false})),{name:'Seu resultado informado',score,local:true}].sort((a,b)=>b.score-a.score).map((row,_,all)=>({...row,rank:1+all.filter(r=>r.score>row.score).length}));
}
