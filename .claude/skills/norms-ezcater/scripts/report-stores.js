() => { const s = document.querySelector('#ez_manage_report_caterer_ids'); let n = 0;
for (const o of s.options) { o.selected = / - Norms - /.test(o.text); if (o.selected) n++; }
const jq = window.jQuery; let p = '';
if (jq) { p = Object.keys(jq(s).data()).join(','); if (jq.fn.multiSelect) jq(s).multiSelect('refresh'); jq(s).trigger('change'); }
return n + ' selected; plugins=' + p + '; ms=' + !!(jq && jq.fn.multiSelect); }
