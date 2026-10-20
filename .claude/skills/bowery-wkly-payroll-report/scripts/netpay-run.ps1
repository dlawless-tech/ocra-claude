# Task Scheduler entry point. Once the week's Payroll GL is in the Payroll folder, pulls the Net Pay Reports from Paycor next to it.
# usage: netpay-run.ps1 [-Date yyyy-MM-dd] [-Force]
# Quiet until the GL lands. A problem posts one Teams card a week tagging Tricia, then retries hourly.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Drop = 'C:\Users\trici\OCRA\Bowery Group - General\Payroll'

$gl = @(Get-ChildItem -LiteralPath $Drop -File -Filter '*Payroll GL*.xlsx' | Where-Object { $_.Name -notlike '~*' })
if (-not $gl.Count) { exit 0 }
# a GL still being written waits for the next tick
if ($gl[0].LastWriteTime -gt (Get-Date).AddMinutes(-5)) { exit 0 }

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$we = $today.AddDays(-[int]$today.DayOfWeek)
if ($gl.Count -eq 1 -and $gl[0].Name -match '^(\d{1,2})\.(\d{1,2})\.(\d{2})') {
  $we = Get-Date -Year (2000 + [int]$Matches[3]) -Month ([int]$Matches[1]) -Day ([int]$Matches[2])
}
$weFull = '{0}/{1}/{2}' -f $we.Month, $we.Day, $we.Year
$run = Join-Path $Repo (".scratch\bowery-wkly-payroll-report\wk{0:MMdd}" -f $we)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'netpay-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
$last = Join-Path $run 'last-problem.txt'
if ((Test-Path $last) -and -not $Force -and (Get-Item $last).LastWriteTime -gt (Get-Date).AddMinutes(-55)) { exit 0 }

$problems = @()
if ($gl.Count -gt 1) { $problems += "The Payroll folder holds $($gl.Count) Payroll GL workbooks: $($gl.Name -join ', ')." }
else {
  Log "pulling Net Pay Reports for W.E. $weFull"
  $ErrorActionPreference = 'Continue'
  $out = & node "$PSScriptRoot\netpay.js" $run $Drop $weFull 2>> $log | Where-Object { $_ -match '^\{' } | Select-Object -Last 1
  $ErrorActionPreference = 'Stop'
  Log "result $out"
  $r = if ($out) { $out | ConvertFrom-Json } else { $null }
  if ($r -and $r.status -eq 'saved') {
    Set-Content -Encoding utf8 $done "saved $(Get-Date -Format s): $(@($r.saved) -join '; ')$(if (@($r.kept).Count) { " | already there: $(@($r.kept) -join '; ')" })"
    Remove-Item -Force -ErrorAction SilentlyContinue $last
    exit 0
  }
  $problems += if ($r) { @($r.problems) } else { 'netpay.js printed no result.' }
}

Set-Content -Encoding utf8 $last ($problems -join "`n")
$mark = Join-Path $run 'notified.txt'
if (-not (Test-Path $mark)) {
  Set-Content -Encoding utf8 $mark (Get-Date -Format s)
  & "$PSScriptRoot\notify-teams.ps1" -Title "Bowery Net Pay Reports, W.E. ${weFull}: not pulled" -Lines (@($problems | ForEach-Object { "- $_" }) + @('Nothing was saved to the Payroll folder. Retrying hourly through Thursday night; pull them by hand if this persists.', "Log: $log"))
}
exit 1
