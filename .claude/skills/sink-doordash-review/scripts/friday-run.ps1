# Task Scheduler entry point, Fridays 10:00. Reviews 13562 through the DoorDash week that ended Sunday, corrects and posts, approves.
# usage: friday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today's date. One marker per week, so a rerun does nothing without -Force. Posts the result to Teams.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
# the Sunday the latest week ended, and a review window five weeks back
$sun = $today.AddDays(-[int]$today.DayOfWeek)
if ($sun -eq $today) { $sun = $sun.AddDays(-7) }
$from = $sun.AddDays(-34)
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }

$run = Join-Path $Repo (".scratch\sink-doordash\wk{0:MMdd}" -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'friday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$marker = Join-Path $run 'started.txt'
if ((Test-Path $marker) -and -not $Force) { exit 0 }
Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)"
Log "review $(D $from) - $(D $sun); starting claude"

$prompt = @"
/sink-doordash-review Unattended run. Follow the skill's Unattended run section.
Work directory: $run
Review from: $(D $from) (GL start $(D $from.AddDays(-7)))
Latest week ends: $(D $sun)
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing its sessions; sessions bind to the work dir
Set-Location $run
foreach ($s in 'sinkd', 'sddu') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }

$result = Join-Path $run 'result.json'
$title = "Sink DoorDash, weeks through $(D $sun)"
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
