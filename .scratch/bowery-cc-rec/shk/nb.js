() => { const k=jQuery('#newGCheckingAccount').data('kendoComboBox'); const d=jQuery('#NewGStatementEndDate').data('kendoDatePicker'); return (k?k.text():'nok')+' | '+(d?d.value():'nod'); }
