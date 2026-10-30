# Read the Uber Eats login from a client's Teams login workbook, read-only.
# Rows run name | link | username | password; the row is the one whose name cell matches -Match.
# Prints JSON {sheet,row,email,password}. -Mask hides the password.
# usage: sheet-login.ps1 -Workbook <path> [-Match '^uber ?eats$'] [-Mask]
param([Parameter(Mandatory)][string]$Workbook, [string]$Match = '(?i)^\s*uber', [switch]$Mask)
$ErrorActionPreference = 'Stop'
$xl = New-Object -ComObject Excel.Application; $xl.Visible = $false; $xl.DisplayAlerts = $false
try {
  $wb = $xl.Workbooks.Open($Workbook, 0, $true)
  $hit = $null
  foreach ($ws in $wb.Worksheets) {
    $v = $ws.UsedRange.Value2
    if ($null -eq $v -or $v -isnot [array]) { continue }
    for ($r = 1; $r -le $v.GetUpperBound(0) -and -not $hit; $r++) {
      $cells = @(for ($c = 1; $c -le $v.GetUpperBound(1); $c++) { "$($v[$r,$c])".Trim() })
      if (-not ($cells | Where-Object { $_ -match $Match })) { continue }
      $i = [array]::FindIndex([string[]]$cells, [Predicate[string]]{ param($x) $x -match '^[^@\s]+@[^@\s]+$' })
      if ($i -lt 0) { continue }
      $pw = if ($i + 1 -lt $cells.Count) { $cells[$i + 1] } else { '' }
      if ($Mask -and $pw) { $pw = '***' }
      $hit = [pscustomobject]@{ sheet = $ws.Name; row = $r; email = $cells[$i]; password = $pw }
    }
    if ($hit) { break }
  }
  $wb.Close($false)
  if (-not $hit) { Write-Error "no Uber Eats row in $Workbook" }
  $hit | ConvertTo-Json -Compress
} finally { $xl.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl) }
