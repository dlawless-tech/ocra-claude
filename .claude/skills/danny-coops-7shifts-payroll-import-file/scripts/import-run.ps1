# Task Scheduler entry point. Pulls last week's payroll journal from 7shifts into the Payroll folder, then hands it to payroll-run.ps1 to post.
# usage: import-run.ps1 [-Date yyyy-MM-dd] [-Force]
# Quiet until saved or a problem. A problem posts one Teams card a week to the payroll channel, then retries on the next tick.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Drop = 'C:\Users\trici\OCRA\Danny and Coops - General\Payroll'
$Notify = (Resolve-Path "$PSScriptRoot\..\..\danny-coops-payroll\scripts\notify-teams.ps1").Path

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$we = $today.AddDays(-[int]$today.DayOfWeek)
$weFull = '{0}/{1}/{2}' -f $we.Month, $we.Day, $we.Year
$run = Join-Path $Repo (".scratch\danny-coops-7shifts-payroll-import-file\wk{0:MMdd}" -f $we)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'import-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }

$ErrorActionPreference = 'Continue'
$out = & node "$PSScriptRoot\journal.js" $run $Drop $weFull 2>> $log | Where-Object { $_ -match '^\{' } | Select-Object -Last 1
$ErrorActionPreference = 'Stop'
Log "result $out"
$r = if ($out) { $out | ConvertFrom-Json } else { $null }
if ($r -and $r.status -in 'saved', 'kept') {
  Set-Content -Encoding utf8 $done "$($r.status) $(Get-Date -Format s): $($r.file)"
  # post the entry now; detached so this task's time limit does not cut it off
  if ($r.status -eq 'saved') {
    $payroll = (Resolve-Path "$PSScriptRoot\..\..\danny-coops-payroll\scripts\payroll-run.ps1").Path
    Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$payroll`" -File `"$($r.file)`""
    Log "handed $($r.file) to payroll-run.ps1"
  }
  exit 0
}
if ($r -and $r.status -eq 'not ready') { exit 0 }

$problems = if ($r) { @($r.problems) } else { @('journal.js printed no result.') }
$mark = Join-Path $run 'notified.txt'
if (-not (Test-Path $mark)) {
  Set-Content -Encoding utf8 $mark (Get-Date -Format s)
  & $Notify -Title "Danny & Coops 7shifts payroll journal, W.E. ${weFull}: not downloaded" -Lines (@($problems | ForEach-Object { "- $_" }) + @('Nothing was saved to the Payroll folder. Retrying hourly through Wednesday 5 PM; download it from 7shifts Payroll by hand if this persists.', "Log: $log"))
}
exit 1
