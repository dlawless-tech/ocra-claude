async () => {
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.querySelector('md-dialog')); const w=d.defaultView;
const el = Array.from(d.querySelectorAll('md-dialog input')).find(x => /^\d{3}-\d{2} - /.test(x.value));
const ac = el.closest('md-autocomplete'); const sc = w.angular.element(ac).isolateScope(); const o = sc.$parent.r365options;
const items = await o.querySearch('104-04'); const it = items.find(x=>/^104-04/.test(x.display)) || items[0];
sc.$parent.$apply(() => { o.selectedItem = it; o.searchText = it.display; o.selectedItemChange(it); });
const sec = Array.from(d.querySelectorAll('span')).find(x => x.textContent.trim() === 'Subtotal By').closest('section');
const b = Array.from(sec.querySelectorAll('button')).find(x => w.angular.element(x).scope().valuePair.display === 'Location');
const bs = w.angular.element(b).scope();
bs.$apply(() => bs.buttonSelected(bs.valuePair, bs.param, {stopPropagation(){}, preventDefault(){}}));
await new Promise(r=>setTimeout(r,1000));
return 'picked '+it.display+' now '+el.value;
}
