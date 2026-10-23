# Task Scheduler entry point, Thursdays 10:00. Reviews 13580 through the Grubhub period that ended Monday, corrects and posts, approves.
# usage: thursday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today's date. One marker per week, so a rerun does nothing without -Force. Posts the result to Teams.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
# the Monday the latest period ended, and a review window five periods back
$mon = $today.AddDays(-(([int]$today.DayOfWeek - 1 + 7) % 7))
if ($mon -eq $today) { $mon = $mon.AddDays(-7) }
$from = $mon.AddDays(-34)
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }
function Iso($x) { $x.ToString('yyyy-MM-dd') }

$run = Join-Path $Repo (".scratch\sink-grubhub\wk{0:MMdd}" -f $mon)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'thursday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$marker = Join-Path $run 'started.txt'
if ((Test-Path $marker) -and -not $Force) { exit 0 }
Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)"
Log "review $(D $from) - $(D $mon); starting claude"

$prompt = @"
/sink-grubhub-review Unattended run. Follow the skill's Unattended run section.
Work directory: $run
Review from: $(Iso $from) (Grubhub start $(Iso $from), GL start $(D $from.AddDays(-14)))
Latest period ends: $(D $mon)
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing its sessions; sessions bind to the work dir
Set-Location $run
foreach ($s in 'sinku', 'sghu') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }

$result = Join-Path $run 'result.json'
$title = "Sink Grubhub, periods through $(D $mon)"
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
