() => {
  const el = document.querySelector('[name="journalEntryLocation_input"]');
  if(!el) return 'no input';
  const $ = jQuery;
  const data = $(el).data();
  const keys = Object.keys(data);
  let ds = null;
  for (const k of keys) { const v = data[k]; if (v && v.dataSource) { ds = v.dataSource; break; } }
  if(!ds) return 'widget keys: ' + keys.join(',');
  const d = ds.data();
  return JSON.stringify(d.map(x=>({n:x.name, id:x.locationId||x.id})).slice(0,80));
}
