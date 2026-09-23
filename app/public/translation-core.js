import {rows} from './translations.js';
const dictionary=new Map(rows.filter(row=>Array.isArray(row)&&row.length===3&&row.every(value=>typeof value==='string'&&value.trim())).map(row=>[row[0],row]));
const pattern=new RegExp('(?<![\\p{L}\\p{N}])(?:'+[...dictionary.keys()].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![\\p{L}\\p{N}])','gu');
export function translate(value,language='pt-BR'){
 const text=String(value??'');if(language==='pt-BR')return text;
 const index=language==='en'?1:2;
 if(dictionary.has(text))return dictionary.get(text)?.[index] ?? text;
 let result=text
 .replace(/de ([\d.,]+) GB · varia com os aplicativos abertos/g,language==='en'?'of $1 GB · varies with open apps':'de $1 GB · varía con las aplicaciones abiertas')
 .replace(/Ethernet negociada em (.+?)\. Confira cabo e porta se a velocidade esperada for maior\./g,language==='en'?'Ethernet negotiated at $1. Check the cable and port if you expect a higher speed.':'Ethernet negoció $1. Revise el cable y el puerto si espera una velocidad mayor.')
 .replace(/ com ([\d.,]+) GB livres/g,language==='en'?' with $1 GB free':' con $1 GB libres')
 .replace(/versão de avaliação/g,language==='en'?'evaluation version':'versión de evaluación')
 .replace(/São Paulo · Brasil/g,language==='en'?'São Paulo · Brazil':'São Paulo · Brasil')
 .replace(/^Baixar /,language==='en'?'Download ':'Descargar ')
 .replace(/Abra o executável Vimaka Workstation Care para reconectar\./g,language==='en'?'Open Vimaka Workstation Care to reconnect.':'Abra Vimaka Workstation Care para reconectar.');
 return result.replace(pattern,key=>dictionary.get(key)?.[index] ?? key);
}
