import {t,locale} from './i18n.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=value=>value.toLocaleString(locale(),{maximumFractionDigits:1});
export function usageChart(total,free){
 if(!Number.isFinite(total)||!Number.isFinite(free)||total<=0||free<0||free>total)return `<p>${t('Não medido')}</p>`;
 const used=total-free,percent=used/total*100;
 const label=`${number(used)} GB ${t('utilizados')} / ${number(free)} GB ${t('livres')}`;
 return `<figure class="usage-chart"><svg viewBox="0 0 160 160" role="img" aria-label="${escape(label)}"><title>${escape(label)}</title><circle class="usage-track" cx="80" cy="80" r="61"/><circle class="usage-fill" cx="80" cy="80" r="61" pathLength="100" stroke-dasharray="${percent} ${100-percent}" transform="rotate(-90 80 80)"/><text x="80" y="79" class="usage-percent">${number(percent)}%</text><text x="80" y="99" class="usage-caption">${t('utilizados')}</text></svg><figcaption><span><i class="legend-used" aria-hidden="true"></i>${number(used)} GB ${t('utilizados')}</span><span><i class="legend-free" aria-hidden="true"></i>${number(free)} GB ${t('livres')}</span></figcaption></figure>`;
}
