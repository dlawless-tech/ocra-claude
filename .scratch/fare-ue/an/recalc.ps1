$f = "C:\Users\trici\OCRA\TML's Files - General\Downloads\FARE Third Party Analysis\FARE UberEats Review 12.29.25 to 9.27.26.xlsx"
$x = New-Object -ComObject Excel.Application; $x.DisplayAlerts = $false
try {
  $wb = $x.Workbooks.Open($f); $x.CalculateFull()
  $out = @{}
  foreach ($name in 'Summary','Sales Tax (excluded)','Fees & Refunds','Discrepancies','Proposed Reclass JE','Uber Detail by Location') {
    $ws = $wb.Worksheets.Item($name); $u = $ws.UsedRange; $rows = @()
    for ($r = 1; $r -le $u.Rows.Count; $r++) { $row = @(); for ($c = 1; $c -le $u.Columns.Count; $c++) { $row += ,$ws.Cells.Item($r,$c).Value2 }; $rows += ,$row }
    $out[$name] = $rows
  }
  $err = @(); foreach ($ws in $wb.Worksheets) { foreach ($cell in $ws.UsedRange.Cells) { if ($cell.Text -like '#*') { $err += $ws.Name + '!' + $cell.Address() + ' ' + $cell.Text } } }
  $out['errors'] = $err
  $out | ConvertTo-Json -Depth 5 -Compress | Out-File -Encoding utf8 C:\Users\trici\ocra-claude\.scratch\fare-ue\an\xl.json
  $wb.Save(); $wb.Close()
} finally { $x.Quit() }
