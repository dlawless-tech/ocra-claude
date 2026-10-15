# Write recon.json to an Excel workbook: Summary tab, then one tab per store with its open advance orders and day exceptions.
# usage: workbook.ps1 -Recon <recon.json> -Out <xlsx>
param([string]$Recon,[string]$Out)
$ErrorActionPreference='Stop'
$r = Get-Content $Recon -Raw | ConvertFrom-Json
$xl = New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
try {
 $wb = $xl.Workbooks.Add()
 while($wb.Worksheets.Count -gt 1){ $wb.Worksheets.Item(2).Delete() }
 $money = '#,##0.00;(#,##0.00);-'
 # Value2 rejects the numbers ConvertFrom-Json gives; Formula takes a string and Excel parses it
 function Put($ws,$row,$vals){ for($i=0;$i -lt $vals.Count;$i++){ $v = $vals[$i]; $s = if($v -is [ValueType]){ ([double]$v).ToString([Globalization.CultureInfo]::InvariantCulture) } elseif("$v" -match '^\d+/\d+/\d+|^\d{4}-\d\d-\d\d$|^-?\d'){ "'$v" } else { "$v" }; $ws.Cells.Item($row,$i+1).Formula = $s } }
 $ws = $wb.Worksheets.Item(1); $ws.Name = 'Summary'
 Put $ws 1 @("Snarf's 20100 Customer Advance Orders vs Toast, $($r.start) to $($r.end)")
 Put $ws 3 @('Store','GL balance','Toast open advance orders','# open','Difference',"Carried in at $($r.start)",'Day exceptions','Unexplained','Status')
 $row = 4
 foreach($s in $r.stores){
  $status = if([math]::Abs($s.diff) -lt 0.005){ 'Ties' } else { 'Needs entry' }
  Put $ws $row @($s.store,$s.glEnd,$s.toastEnd,$s.open.Count,$s.diff,$s.begDiff,$s.dayNet,$s.unexplained,$status); $row++ }
 Put $ws $row @('Total',"=SUM(B4:B$($row-1))","=SUM(C4:C$($row-1))","=SUM(D4:D$($row-1))","=SUM(E4:E$($row-1))","=SUM(F4:F$($row-1))","=SUM(G4:G$($row-1))","=SUM(H4:H$($row-1))")
 $ws.Range("B4:C$row").NumberFormat = $money; $ws.Range("E4:H$row").NumberFormat = $money
 $ws.Rows.Item(3).Font.Bold = $true; $ws.Rows.Item($row).Font.Bold = $true; $ws.Cells.Item(1,1).Font.Bold = $true
 $ws.Columns.AutoFit() | Out-Null
 foreach($s in $r.stores){
  $ws = $wb.Worksheets.Add([Type]::Missing, $wb.Worksheets.Item($wb.Worksheets.Count)); $ws.Name = $s.store
  Put $ws 1 @("$($s.store): GL $($s.glEnd) vs Toast $($s.toastEnd), difference $($s.diff)"); $ws.Cells.Item(1,1).Font.Bold = $true
  Put $ws 3 @("Open advance orders at $($r.end) (paid on or before, order after)"); $ws.Cells.Item(3,1).Font.Bold = $true
  Put $ws 4 @('Order date','Paid','Order #','Name','Type','Amount'); $ws.Rows.Item(4).Font.Bold = $true
  $row = 5; $top = $row
  foreach($o in $s.open){ Put $ws $row @($o.ordered,$o.paid,$o.order,$o.name,$o.type,$o.amt); $row++ }
  Put $ws $row @('Total','','','','',"=SUM(F$($top):F$([math]::Max($top,$row-1)))"); $ws.Rows.Item($row).Font.Bold = $true; $ws.Range("F$($top):F$row").NumberFormat = $money
  $row += 2
  Put $ws $row @("Difference: carried in at $($r.start)",$s.begDiff); $ws.Cells.Item($row,2).NumberFormat = $money; $row++
  Put $ws $row @('Day exceptions (GL less Toast advance payments)'); $ws.Rows.Item($row).Font.Bold = $true; $row++
  Put $ws $row @('Day','Extra credit','Extra debit','Net','What Toast shows'); $ws.Rows.Item($row).Font.Bold = $true; $row++; $top = $row
  foreach($e in $s.exceptions){
   $why = @()
   foreach($l in $e.late){ $why += "$($l.type) $($l.amt) order $($l.order) $($l.side) (paid $($l.paid), ordered $($l.ordered))" }
   if($e.extraDebit -lt 0){ foreach($o in $e.ordersDue){ $why += "advance order $($o.order) $($o.amt) due today (paid $($o.paid))" } }
   if(-not $why.Count){ $why += 'no Toast payment found; check the DSS' }
   Put $ws $row @($e.d,$e.extraCredit,$e.extraDebit,$e.net,($why -join '; ')); $row++ }
  Put $ws $row @('Total',"=SUM(B$($top):B$([math]::Max($top,$row-1)))","=SUM(C$($top):C$([math]::Max($top,$row-1)))","=SUM(D$($top):D$([math]::Max($top,$row-1)))"); $ws.Rows.Item($row).Font.Bold = $true
  $ws.Range("B$($top):D$row").NumberFormat = $money
  $ws.Columns.Item(1).ColumnWidth = 20; $ws.Columns.Item(2).ColumnWidth = 16; $ws.Columns.Item(3).ColumnWidth = 14; $ws.Columns.Item(4).ColumnWidth = 22; $ws.Columns.Item(5).ColumnWidth = 14; $ws.Columns.Item(6).ColumnWidth = 12
 }
 $wb.Worksheets.Item(1).Activate()
 $wb.SaveAs($Out, 51); $wb.Close($false)
 "saved $Out"
} finally { $xl.Quit(); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null }
