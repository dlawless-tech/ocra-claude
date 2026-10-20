# Task Scheduler entry point. Posts the Foodja fees for the Sunday just ended, then posts to Teams.
# usage: tuesday-run.ps1 [-Date yyyy-MM-dd] [-Force]
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

# the Sunday that ended before today, and the one before it
$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$sun = $today.AddDays(-[int]$today.DayOfWeek)
if ($sun -eq $today) { $sun = $sun.AddDays(-7) }
$prior = $sun.AddDays(-7)
$fmt = { param($d) '{0}/{1}/{2}' -f $d.Month, $d.Day, $d.Year }
$weFull = & $fmt $sun
$base = Join-Path $Repo '.scratch\flecha-foodja'
$run = Join-Path $base ("wk{0:MMdd}" -f $sun)
$priorIds = Join-Path $base ("wk{0:MMdd}\ids.txt" -f $prior)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'tuesday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
$title = "Flecha Foodja, W.E. $weFull"

$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
Log 'starting claude'
$prompt = @"
/flecha-foodja Unattended run: post the Foodja fees for the week ending $weFull. Follow the skill's Unattended run section.
Work directory: $run
Prior week's ids: $priorIds
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; the sessions bind to the work directory
Set-Location $run
foreach ($s in 'ffj', 'ffjr') { & playwright-cli -s=$s close 2>&1 | Out-Null }
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"

try {
  if (-not (Test-Path $result)) {
    & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Nothing was confirmed posted. Check the log:', $log)
    exit 1
  }
  & $Notify -Title $title -ResultFile $result
} catch { Log "teams post failed: $_"; exit 1 }
