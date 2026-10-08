() => { const jq = window.jQuery; const a = jq('#ez_manage_report_start_date'), b = jq('#ez_manage_report_end_date');
a.datepicker('setDate', new Date(2026, 7, 9)); a.trigger('change');
b.datepicker('setDate', new Date(2026, 8, 5)); b.trigger('change');
return [a.val(), b.val(), a.datepicker('option', 'dateFormat'), String(a.datepicker('option', 'maxDate')), String(b.datepicker('option', 'minDate'))].join(' | '); }
