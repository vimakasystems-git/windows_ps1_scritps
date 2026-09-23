import {rows} from './translations.js';
export const locales=['pt-BR','en','es'];
let language='pt-BR';
try {const saved=localStorage.getItem('vimaka-language');language=locales.includes(saved)?saved:navigator.language.startsWith('en')?'en':navigator.language.startsWith('es')?'es':'pt-BR';} catch {}
export const locale=()=>language;
const dictionary=new Map(rows.map(row=>[row[0],row]));
const pattern=new RegExp('(?<![\\p{L}\\p{N}])(?:'+[...dictionary.keys()].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![\\p{L}\\p{N}])','gu');
export function t(value){
 const text=String(value??'');if(language==='pt-BR')return text;
 const index=language==='en'?1:2;
 if(dictionary.has(text))return dictionary.get(text)[index];
 let result=text
 .replace(/de ([\d.,]+) GB · varia com os aplicativos abertos/g,language==='en'?'of $1 GB · varies with open apps':'de $1 GB · varía con las aplicaciones abiertas')
 .replace(/Ethernet negociada em (.+?)\. Confira cabo e porta se a velocidade esperada for maior\./g,language==='en'?'Ethernet negotiated at $1. Check the cable and port if you expect a higher speed.':'Ethernet negoció $1. Revise el cable y el puerto si espera una velocidad mayor.')
 .replace(/ com ([\d.,]+) GB livres/g,language==='en'?' with $1 GB free':' con $1 GB libres')
 .replace(/versão de avaliação/g,language==='en'?'evaluation version':'versión de evaluación')
 .replace(/São Paulo · Brasil/g,language==='en'?'São Paulo · Brazil':'São Paulo · Brasil')
 .replace(/^Baixar /,language==='en'?'Download ':'Descargar ')
 .replace(/Abra o executável Vimaka Windows Care para reconectar\./g,language==='en'?'Open Vimaka Windows Care to reconnect.':'Abra Vimaka Windows Care para reconectar.');
 return result.replace(pattern,key=>dictionary.get(key)[index]);
}
const records=new WeakMap();
const excluded='script,style,pre,textarea,output,option,[translate="no"]';
function convert(node,attribute){
 const current=attribute?node.getAttribute(attribute):node.nodeValue;
 if(!current?.trim())return;
 let record=records.get(node);if(!record){record={};records.set(node,record);}
 const key=attribute||'text';let item=record[key];
 if(!item||current!==item.rendered)item=record[key]={original:current,rendered:current};
 const next=t(item.original);item.rendered=next;
 if(next!==current){if(attribute)node.setAttribute(attribute,next);else node.nodeValue=next;}
}
const observer=new MutationObserver(()=>translatePage());
export function translatePage(){
 observer.disconnect();
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 let node;while(node=walker.nextNode()){if(!node.parentElement?.closest(excluded))convert(node);}
 document.querySelectorAll('[placeholder],[aria-label],[alt]').forEach(el=>{if(el.closest('[translate="no"]'))return;for(const attr of ['placeholder','aria-label','alt'])if(el.hasAttribute(attr))convert(el,attr);});
 document.documentElement.lang=language;
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','alt']});
}
const selector=document.getElementById('language');selector.value=language;
selector.addEventListener('change',()=>{language=locales.includes(selector.value)?selector.value:'pt-BR';try{localStorage.setItem('vimaka-language',language);}catch{}document.dispatchEvent(new Event('languagechange'));translatePage();});
translatePage();
