# Task Scheduler entry point. Runs the skill unattended for the week that ended last Saturday, then posts to Teams.
# usage: monday-run.ps1 [-Date yyyy-MM-dd] [-LastTry 10:00] [-Force]
# A store held for short sales gets another try on the next trigger; the week is done once nothing is held or LastTry has passed.
param([string]$Date, [string]$LastTry = '10:00', [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

# the Sunday-Saturday week that ended before today
$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$sat = $today.AddDays(-(([int]$today.DayOfWeek + 1) % 7))
if ($sat -eq $today) { $sat = $sat.AddDays(-7) }
$weFull = '{0}/{1}/{2}' -f $sat.Month, $sat.Day, $sat.Year
$prior = $sat.AddDays(-7)
$run = Join-Path $Repo (".scratch\norms-cc-fees\wk{0:MMdd}" -f $sat)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'monday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
$lastTry = ($Date -ne '') -or ((Get-Date) -ge [datetime]::Parse($LastTry))
$title = "NORMS CC Fee Accrual, W.E. $weFull"

$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
Log "starting claude (last try: $lastTry)"
$prompt = @"
/norms-weekly-cc-fees-accrual Unattended run for the week ending $weFull. Follow the skill's Unattended run section.
Prior week ending: $('{0}/{1}/{2}' -f $prior.Month, $prior.Day, $prior.Year)
Work directory: $run
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; sessions bind to the repo root
& playwright-cli -s=ccfu close 2>&1 | Out-Null

if (-not (Test-Path $result)) {
  Set-Content -Encoding utf8 $done "failed $(Get-Date -Format s)"
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Nothing was confirmed posted. Check the log:', $log)
  exit 1
}
$r = Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json
$held = @($r.stores | Where-Object { $_.status -eq 'held' })
if (-not $held.Count -or $lastTry) { Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)" }
& $Notify -Title $title -ResultFile $result -Retrying:($held.Count -gt 0 -and -not $lastTry)
