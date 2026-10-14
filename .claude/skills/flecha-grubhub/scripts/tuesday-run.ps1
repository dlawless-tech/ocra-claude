# Task Scheduler entry point. Trues up last period's estimates and estimates the Tue-Mon period that ended yesterday, then posts to Teams.
# usage: tuesday-run.ps1 [-Date yyyy-MM-dd] [-Force]
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Ids = Join-Path $Repo '.scratch\flecha-grubhub\ids.txt'

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$mon = $today.AddDays(-((([int]$today.DayOfWeek) + 6) % 7)); if ($mon -eq $today) { $mon = $mon.AddDays(-7) }
$mdy = { param($x) '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }
# entry dates of the Tue-Mon period ending $end: split at month end, each part dated its Sunday, else its last day
function EntryDates($end) {
  $a = $end.AddDays(-6); $cut = (Get-Date -Year $a.Year -Month $a.Month -Day 1).Date.AddMonths(1).AddDays(-1)
  $parts = @(, @($a, $end)); if ($cut -lt $end) { $parts = @(@($a, $cut), @($cut.AddDays(1), $end)) }
  foreach ($p in $parts) {
    $e = $p[1]; for ($x = $p[0]; $x -le $p[1]; $x = $x.AddDays(1)) { if ($x.DayOfWeek -eq 'Sunday') { $e = $x } }
    & $mdy $e
  }
}
$new = @(EntryDates $mon)
# true up only last period's entries still on file as estimates; a month-end stub posted by hand is already an actual
$posted = if (Test-Path $Ids) { @(Get-Content $Ids | ForEach-Object { ($_ -split '\|')[0] }) } else { @() }
$prior = @(EntryDates $mon.AddDays(-7) | Where-Object { $_ -in $posted })
$period = '{0}/{1}-{2}/{3}' -f $mon.AddDays(-6).Month, $mon.AddDays(-6).Day, $mon.Month, $mon.Day

$run = Join-Path $Repo (".scratch\flecha-grubhub\wk{0:MMdd}" -f $mon)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'tuesday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
$title = "Flecha GrubHub, period $period"

$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
Log "starting claude: true up [$($prior -join ' ')], estimate [$($new -join ' ')]"
$prompt = @"
/flecha-grubhub Unattended run for the period $period. Follow the skill's Unattended run section.
Report end: $(& $mdy $mon). True up: $(if ($prior) { $prior -join ' ' } else { 'none' }). Estimate: $($new -join ' ').
ids file: $Ids
Work directory: $run
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; the session binds to the work directory
Set-Location $run
& playwright-cli -s=flgh close 2>&1 | Out-Null
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"

if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Nothing was confirmed posted. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
