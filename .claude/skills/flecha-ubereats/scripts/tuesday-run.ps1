# Task Scheduler entry point. Trues up the prior Sunday, estimates the Sunday just ended, then posts to Teams.
# usage: tuesday-run.ps1 [-Date yyyy-MM-dd] [-Force]
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

# the Sunday that ended before today, and the one before it; 10/11/2026 is the first week, so nothing before it
$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$sun = $today.AddDays(-[int]$today.DayOfWeek)
if ($sun -eq $today) { $sun = $sun.AddDays(-7) }
$prior = $sun.AddDays(-7)
$first = $sun -le [datetime]'2026-10-11'
$fmt = { param($d) '{0}/{1}/{2}' -f $d.Month, $d.Day, $d.Year }
$weFull = & $fmt $sun; $priorFull = & $fmt $prior
$base = Join-Path $Repo '.scratch\flecha-ubereats'
$run = Join-Path $base ("wk{0:MMdd}" -f $sun)
$priorIds = Join-Path $base ("wk{0:MMdd}\ids.txt" -f $prior)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'tuesday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
$title = "Flecha Uber Eats, W.E. $weFull"

$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
Log 'starting claude'
$task = if ($first) { "estimate the week ending $weFull, the first week (nothing to true up)" } else { "true up the week ending $priorFull and estimate the week ending $weFull" }
$prompt = @"
/flecha-ubereats Unattended run: $task. Follow the skill's Unattended run section.
Work directory: $run
Prior week's ids: $(if ($first) { 'none, first run' } else { $priorIds })
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; the session binds to the work directory
Set-Location $run
& playwright-cli -s=fue close 2>&1 | Out-Null
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"

try {
  if (-not (Test-Path $result)) {
    & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Nothing was confirmed posted. Check the log:', $log)
    exit 1
  }
  & $Notify -Title $title -ResultFile $result
} catch { Log "teams post failed: $_"; exit 1 }
