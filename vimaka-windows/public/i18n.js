import {translate} from './translation-core.js';
export const locales=['pt-BR','en','es'];
let language='pt-BR';
try {const saved=localStorage.getItem('vimaka-language');language=locales.includes(saved)?saved:navigator.language.startsWith('en')?'en':navigator.language.startsWith('es')?'es':'pt-BR';} catch {}
export const locale=()=>language;
export const t=value=>translate(value,language);
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
