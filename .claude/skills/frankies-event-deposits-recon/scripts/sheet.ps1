# Apply ops to one tab's deposit list (A:E) and receivable list (G:J), then rewrite both lists and save.
# usage: sheet.ps1 -File <xlsx> -Sheet <tab> -Ops <ops.json> [-DryRun]
# ops: {"op":"add","side":"dep","collected":"7/1/2026","event":"10/21/2026"|"TBD","name":"...","amt":5307.11}
#      {"op":"add","side":"rec","event":"7/5/2026","name":"...","amt":5227.37}
#      {"op":"clr","side":"dep"|"rec","name":"...","amt":123.45[,"event":"7/4/2026"]}   moves the amount to E or J (cleared this week)
#      {"op":"rm", "side":"dep"|"rec","name":"...","amt":123.45[,"event":...]}         deletes the row
#      {"op":"purge"}                                                                  deletes every row cleared to E or J (start of a week)
# Deposits keep sheet order, a new row going above the first dated row with an earlier event date.
# Receivables keep sheet order, a new row going below the last row dated on or before it.
# Receivables start on the row after the last deposit. Prints the D and I totals.
param([string]$File,[string]$Sheet,[string]$Ops,[switch]$DryRun)
$ErrorActionPreference='Stop'
$opList = @((Get-Content $Ops -Raw | ConvertFrom-Json) | ForEach-Object { $_ })
$xl = New-Object -ComObject Excel.Application; $xl.Visible=$false; $xl.DisplayAlerts=$false
try {
 $wb = $xl.Workbooks.Open($File); $ws = $wb.Worksheets.Item($Sheet)
 $totRow = 0; for($r=5;$r -le 400;$r++){ if("$($ws.Cells.Item($r,4).Formula)" -like '=SUM(*'){ $totRow=$r; break } }
 if(-not $totRow){ throw "no SUM total in column D" }
 # dep row: A,B,C,D,E ; rec row: G,H,I,J
 $cols = @{ dep=@(1,2,3,4,5); rec=@(7,8,9,10) }
 $lists = @{}
 foreach($k in 'dep','rec'){ $L = New-Object System.Collections.ArrayList
  for($r=5;$r -lt $totRow;$r++){ $vals=@(); foreach($x in $cols[$k]){ $vals += ,$ws.Cells.Item($r,$x).Formula }
   $ni = if($k -eq 'dep'){2}else{1}; if(("$($vals[$ni])").Trim() -ne ''){ [void]$L.Add($vals) } }
  $lists[$k]=$L }
 $num = { param($f) if("$f" -like '=*'){ [double]$xl.Evaluate(("$f").Substring(1)) } elseif("$f".Trim() -eq '' -or "$f".Trim() -notmatch '^-?[\d.]+$'){ 0 } else { [double]"$f" } }
 $amtOf = { param($v,$k) if($k -eq 'dep'){ (& $num $v[3]) + (& $num $v[4]) } else { (& $num $v[2]) + (& $num $v[3]) } }
 $isClr = { param($v,$k) if($k -eq 'dep'){ "$($v[4])".Trim() -ne '' } else { "$($v[3])".Trim() -ne '' } }
 $evOf = { param($v,$k) if($k -eq 'dep'){ "$($v[1])" } else { "$($v[0])" } }
 $nameOf = { param($v,$k) if($k -eq 'dep'){ "$($v[2])".Trim() } else { "$($v[1])".Trim() } }
 $d = { param($s) if("$s" -eq 'TBD' -or "$s" -eq ''){ 'TBD' } else { ([datetime]$s).ToOADate() } }
 $find = { param($o)
  $L=$lists[$o.side]
  foreach($v in $L){ if(& $isClr $v $o.side){ continue }
   if((& $nameOf $v $o.side).ToLower() -ne "$($o.name)".Trim().ToLower()){ continue }
   if([math]::Abs((& $amtOf $v $o.side)-[double]$o.amt) -ge 0.005){ continue }
   $ev = & $evOf $v $o.side
   if($o.event -and "$ev" -ne 'TBD' -and "$ev" -match '^[\d.]+$' -and [math]::Abs([double]$ev - ([datetime]$o.event).ToOADate()) -gt 0.5){ continue }
   return ,$v }
  throw "$($o.op) not found: $($o.side) [$($o.name)] $($o.amt) $($o.event)" }
 foreach($o in $opList){
  if($o.op -eq 'purge'){ foreach($k in 'dep','rec'){ $keep=New-Object System.Collections.ArrayList; foreach($v in $lists[$k]){ if(-not (& $isClr $v $k)){ [void]$keep.Add($v) } }; $lists[$k]=$keep }; continue }
  $L=$lists[$o.side]
  if($o.op -eq 'rm'){ $hit = & $find $o; $L.Remove($hit); continue }
  if($o.op -eq 'clr'){ $hit = & $find $o; if($o.side -eq 'dep'){ $hit[4]=$hit[3]; $hit[3]='' } else { $hit[3]=$hit[2]; $hit[2]='' }; continue }
  if($o.op -ne 'add'){ throw "bad op $($o.op)" }
  $ev = & $d $o.event
  if($o.side -eq 'dep'){
   $row=@((& $d $o.collected), $ev, "$($o.name)", "$($o.amt)", '')
   $at=$L.Count; if($ev -ne 'TBD'){ for($i=0;$i -lt $L.Count;$i++){ $e="$($L[$i][1])"; if($e -match '^[\d.]+$' -and [double]$e -lt $ev){ $at=$i; break } } } else { $at=0 }
   $L.Insert($at,$row)
  } else {
   $row=@($ev, "$($o.name)", "$($o.amt)", '')
   $at=0; for($i=0;$i -lt $L.Count;$i++){ $e="$($L[$i][0])"; if($e -match '^[\d.]+$' -and [double]$e -le $ev){ $at=$i+1 } }
   $L.Insert($at,$row) } }
 $need = $lists.dep.Count + $lists.rec.Count + 2
 while(($totRow-5) -lt $need){ $ws.Rows.Item($totRow-1).Insert() | Out-Null; $totRow++ }
 $ws.Range("A5:E$($totRow-1)").ClearContents() | Out-Null; $ws.Range("G5:J$($totRow-1)").ClearContents() | Out-Null
 $r=5; foreach($v in $lists.dep){ for($j=0;$j -lt 5;$j++){ $ws.Cells.Item($r,$cols.dep[$j]).Formula=[string]$v[$j] }; $r++ }
 foreach($v in $lists.rec){ for($j=0;$j -lt 4;$j++){ $ws.Cells.Item($r,$cols.rec[$j]).Formula=[string]$v[$j] }; $r++ }
 $acct='_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)'
 foreach($c in 'A','B','G'){ $ws.Range("$($c)5:$($c)$($totRow-1)").NumberFormat='m/d/yy;@' }
 foreach($c in 'D','E','I','J'){ $ws.Range("$($c)5:$($c)$($totRow-1)").NumberFormat=$acct }
 $ws.Cells.Item($totRow,4).Formula="=SUM(D4:D$($totRow-1))"; $ws.Cells.Item($totRow,9).Formula="=SUM(I4:I$($totRow-1))"
 $xl.Calculate()
 "rows dep=$($lists.dep.Count) rec=$($lists.rec.Count) total row=$totRow"
 "D total=" + [math]::Round($ws.Cells.Item($totRow,4).Value2,2) + "  I total=" + [math]::Round($ws.Cells.Item($totRow,9).Value2,2)
 if($DryRun){ $wb.Close($false); "DRYRUN not saved" } else { $wb.Save(); $wb.Close($false); "saved" }
} finally { $xl.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl) }
