# Apply removes/adds to the deposit (B:E) and receivable (H:J) lists of one tab, keep each sorted by event date desc, save.
# usage: sheet.ps1 -File <xlsx> -Sheet <tab> -Ops <ops.json> [-DryRun]
# ops.json: [{"op":"rm","side":"dep"|"rec","name":"...","amt":123.45}, {"op":"add","side":"dep"|"rec","collected":"9/2/2026","event":"10/13/2026"|"TBD","name":"...","amt":12500}]
param([string]$File,[string]$Sheet,[string]$Ops,[switch]$DryRun)
$ErrorActionPreference='Stop'
$opList = @((Get-Content $Ops -Raw | ConvertFrom-Json) | ForEach-Object { $_ })
$xl = New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
try {
 $wb = $xl.Workbooks.Open($File); $ws = $wb.Worksheets.Item($Sheet)
 $totRow = 0; for($r=8;$r -le 200;$r++){ if("$($ws.Cells.Item($r,5).Formula)" -like '=SUM(*'){ $totRow=$r; break } }
 if(-not $totRow){ throw "no SUM total in column E" }
 $sides = @{ dep=@{cols=@(2,3,4,5); amtCol=5}; rec=@{cols=@(8,9,10,11); amtCol=10} }
 $lists = @{}
 foreach($k in 'dep','rec'){ $L = New-Object System.Collections.ArrayList
  for($r=8;$r -lt $totRow;$r++){ $c=$sides[$k].cols; $vals=@(); foreach($x in $c){ $vals += ,$ws.Cells.Item($r,$x).Formula }
   $ni = if($k -eq 'dep'){2}else{1}; if(("$($vals[$ni])").Trim() -ne ''){ [void]$L.Add($vals) } }
  $lists[$k]=$L }
 $amtOf = { param($v,$k) if($k -eq 'dep'){ $f=$v[3] } else { $f= if("$($v[2])" -ne ''){$v[2]}else{$v[3]} }; if("$f" -like '=*'){ [double]$xl.Evaluate(("$f").Substring(1)) } elseif("$f".Trim() -eq ""){ 0 } else { [double]"$f" } }
 foreach($o in $opList){ $L=$lists[$o.side]
  if($o.op -eq 'rm'){ $hit=$null; foreach($v in $L){ if(("$($v[$(if($o.side -eq "dep"){2}else{1})])").Trim() -eq $o.name -and [math]::Abs((& $amtOf $v $o.side)-[double]$o.amt) -lt 0.005){
     $ev = if($o.side -eq 'dep'){$v[1]}else{$v[0]}
     if($o.event -and "$ev" -ne 'TBD' -and [math]::Abs([double]$ev - ([datetime]$o.event).ToOADate()) -gt 0.5){ continue }
     $hit=$v; break } }
   if(-not $hit){ throw "rm not found: $($o.side) $($o.name) $($o.amt) $($o.event)" }; $L.Remove($hit) }
  else { $d = { param($s) if($s -eq 'TBD'){ 'TBD' } else { ([datetime]$s).ToOADate() } }
   if($o.side -eq 'dep'){ [void]$L.Add(@((& $d $o.collected), (& $d $o.event), $o.name, "$($o.amt)")) } else { [void]$L.Add(@((& $d $o.event), $o.name, "$($o.amt)", '')) } } }
 $key = { param($v,$k) $e = if($k -eq 'dep'){$v[1]}else{$v[0]}; if("$e" -eq 'TBD'){ 1e9 } else { [double]$e } }
 # stable: ties keep sheet order, new rows after
 foreach($k in 'dep','rec'){ $src=$lists[$k]; $ix=@(0..($src.Count-1) | Where-Object { $src.Count -gt 0 })
  $ix = @($ix | Sort-Object -Property @{Expression={ & $key $src[$_] $k }; Descending=$true}, @{Expression={ $_ }; Ascending=$true})
  $out = New-Object System.Collections.ArrayList; foreach($i in $ix){ [void]$out.Add($src[$i]) }; $lists[$k]=$out }
 $need = [math]::Max($lists.dep.Count,$lists.rec.Count)
 while(($totRow-8) -lt ($need+2)){ $ws.Rows.Item($totRow-1).Insert() | Out-Null; $totRow++ }
 foreach($k in 'dep','rec'){ $c=$sides[$k].cols; $i=0
  for($r=8;$r -lt $totRow;$r++){ foreach($j in 0..3){ $cell=$ws.Cells.Item($r,$c[$j]); if($i -lt $lists[$k].Count){ $cell.Formula = [string]$lists[$k][$i][$j] } else { $cell.ClearContents() | Out-Null } }; $i++ } }
 $acct='_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)'
 foreach($col in 'B','C','H'){ $ws.Range("$($col)8:$($col)$($totRow-1)").NumberFormat='m/d/yy;@' }
 foreach($col in 'E','J','K'){ $ws.Range("$($col)8:$($col)$($totRow-1)").NumberFormat=$acct }
 $xl.Calculate()
 "rows dep=$($lists.dep.Count) rec=$($lists.rec.Count) total row=$totRow"
 "E total=" + $ws.Cells.Item($totRow,5).Value2 + "  J total=" + $ws.Cells.Item($totRow,10).Value2 + "  K sum=" + $xl.WorksheetFunction.Sum($ws.Range("K8:K$($totRow-1)"))
 if($DryRun){ $wb.Close($false); "DRYRUN not saved" } else { $wb.Save(); $wb.Close($false); "saved" }
} finally { $xl.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl) }
