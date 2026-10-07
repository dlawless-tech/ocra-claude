# Task Scheduler entry point, Tuesdays 22:30. Posts the Grubhub period that ended eight days ago, whose deposits have landed.
# usage: tuesday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today's date. One marker per period, so a rerun does nothing without -Force. Posts the result to Teams.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$tue = $today.AddDays(-(([int]$today.DayOfWeek - 2 + 7) % 7))
$p0 = $tue.AddDays(-14); $p1 = $tue.AddDays(-8); $sun = $tue.AddDays(-9)
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }
function Iso($x) { $x.ToString('yyyy-MM-dd') }

# month end inside the period, before its Monday, splits it in two parts
$parts = @()
if ($p0.Month -ne $p1.Month) {
  $me = $p1.AddDays(-$p1.Day)
  $ad = if ($me -eq $sun) { $p1 } else { $sun }
  $parts += "- Before month end: sales $(Iso $p0) to $(Iso $me), entry dated $(D $me) ($(if ($me -eq $sun) {'Sunday template'} else {'new entry, duplicate-entry.sh'}))"
  $parts += "- After month end: sales $(Iso $me.AddDays(1)) to $(Iso $p1), entry dated $(D $ad) ($(if ($ad -eq $sun) {'Sunday template'} else {'new entry, duplicate-entry.sh'}))"
} else {
  $parts += "- Whole period: sales $(Iso $p0) to $(Iso $p1), entry dated $(D $sun) (Sunday template)"
}

$run = Join-Path $Repo (".scratch\bowery-grubhub\wk{0:MMdd}" -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'tuesday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$marker = Join-Path $run 'started.txt'
if ((Test-Path $marker) -and -not $Force) { exit 0 }
Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)"
Log "period $(D $p0) - $(D $p1); starting claude"

$prompt = @"
/bowery-grubhub Unattended run for the Grubhub period $(D $p0) to $(D $p1). Follow the skill's Unattended run section.
Work directory: $run
Deposit pull window (paid dates): $(Iso $p0) to $(Iso $today.AddDays(1))
Parts:
$($parts -join "`n")
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing its sessions; sessions bind to the repo dir
foreach ($s in 'bghu', 'bju', 'bbu', 'bpdf') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }

$result = Join-Path $run 'result.json'
$title = "Bowery Grubhub, period $(D $p0) - $(D $p1)"
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
