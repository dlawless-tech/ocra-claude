# Task Scheduler entry point, Tuesdays 21:00. Posts the Grubhub period that ended eight days ago; its deposit paid the Friday after.
# usage: tuesday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today's date. One marker per period, so a rerun does nothing without -Force. Posts the result to Teams.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$tue = $today.AddDays(-(([int]$today.DayOfWeek - 2 + 7) % 7))
$p0 = $tue.AddDays(-14); $p1 = $tue.AddDays(-8); $sun = $tue.AddDays(-9); $prev = $sun.AddDays(-7)
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }
function Iso($x) { $x.ToString('yyyy-MM-dd') }

$base = Join-Path $Repo '.scratch\fare-grubhub'
$run = Join-Path $base ("wk{0:MMdd}" -f $sun)
$prevIds = Join-Path $base ("wk{0:MMdd}\ids.txt" -f $prev)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'tuesday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$marker = Join-Path $run 'started.txt'
if ((Test-Path $marker) -and -not $Force) { exit 0 }
Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)"
Log "period $(D $p0) - $(D $p1); starting claude"

$prompt = @"
/fare-grubhub Unattended run for the Grubhub period $(D $p0) to $(D $p1), entry dated $(D $sun). Follow the skill's Unattended run section.
Work directory: $run
Period start and end: $(Iso $p0) $(Iso $p1)
Prior week's ids: $prevIds
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing its sessions; sessions bind to the work dir
Set-Location $run
foreach ($s in 'fghu', 'fghru') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }

$result = Join-Path $run 'result.json'
$title = "FARE Grubhub, week ending $(D $sun) (period $(D $p0) - $(D $p1))"
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
