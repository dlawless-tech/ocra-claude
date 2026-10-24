# Task Scheduler entry point: Thu 15:00. Re-reconciles the week before, then reconciles the Mon-Sun week ended the Sunday before.
# usage: thursday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today. done.txt marks a reported week, so a second run does nothing without -Force.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$sun = $today.AddDays(-(([int]$today.DayOfWeek + 7) % 7)); if ($sun -eq $today) { $sun = $sun.AddDays(-7) }
$mon = $sun.AddDays(-6); $prev = $sun.AddDays(-7)
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }

$run = Join-Path $Repo (".scratch\frankies-event-deposits\wk{0:MMdd}" -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'thursday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$done = Join-Path $run 'done.txt'
$result = Join-Path $run 'result.json'
if ((Test-Path $done) -and -not $Force) { exit 0 }
Log "week $(D $mon) - $(D $sun), lookback week ending $(D $prev); starting claude"

$prompt = @"
/frankies-event-deposits-recon Unattended run. Follow the skill's Unattended run section.
Lookback week: $(D $prev.AddDays(-6)) to $(D $prev) (tab {0:MM.dd})
Current week: $(D $mon) to $(D $sun) (tab {1:MM.dd})
Work directory: $run
"@ -f $prev, $sun
Remove-Item -ErrorAction SilentlyContinue $result
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing its session; sessions bind to the work dir
Set-Location $run
& playwright-cli -s=fku close 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'

$title = "Frankies 457 event deposits recon, week ending $(D $sun)"
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"
& $Notify -Title $title -ResultFile $result
