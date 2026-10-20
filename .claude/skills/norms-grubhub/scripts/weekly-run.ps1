# Task Scheduler entry point, Tuesdays 15:00. Posts the Grubhub period that ended Monday from its order transactions,
# a day before Grubhub creates the deposits.
# usage: weekly-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today's date. One marker per period, so a rerun does nothing without -Force. Posts the result to Teams.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
# the latest Monday before today closes the period
$back = ([int]$today.DayOfWeek - 1 + 7) % 7; if ($back -eq 0) { $back = 7 }
$p1 = $today.AddDays(-$back); $p0 = $p1.AddDays(-6); $sat = $p1.AddDays(-2)
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }
function Iso($x) { $x.ToString('yyyy-MM-dd') }

# month end inside the period, before its Monday, splits it in two parts
$parts = @()
if ($p0.Month -ne $p1.Month) {
  $me = $p1.AddDays(-$p1.Day)
  $bd = if ($sat -le $me) { $sat } else { $me }
  $ad = if ($sat -gt $me) { $sat } else { $p1 }
  $parts += "- Before month end: sales $(Iso $p0) to $(Iso $me), entry dated $(D $bd) ($(if ($bd -eq $sat) {'Saturday template'} else {'new entry, duplicate-post.sh'}))"
  $parts += "- After month end: sales $(Iso $me.AddDays(1)) to $(Iso $p1), entry dated $(D $ad) ($(if ($ad -eq $sat) {'Saturday template'} else {'new entry, duplicate-post.sh'}))"
} else {
  $parts += "- Whole period: sales $(Iso $p0) to $(Iso $p1), entry dated $(D $sat) (Saturday template)"
}

$run = Join-Path $Repo (".scratch\norms-grubhub\wk{0:MMdd}" -f $sat)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'weekly-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$marker = Join-Path $run 'started.txt'
if ((Test-Path $marker) -and -not $Force) { exit 0 }
Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)"
Log "period $(D $p0) - $(D $p1); starting claude"

$prompt = @"
/norms-grubhub Unattended run for the Grubhub period $(D $p0) to $(D $p1). Follow the skill's Unattended run section.
Work directory: $run
Figures: scripts/transactions.js over each part's sales window (Chicago days), standing in for the deposits, which Grubhub creates Wednesday.
Prior period's deposits, for the beginning balance check (paid dates): $(Iso $p0) to $(Iso $today.AddDays(1))
Parts:
$($parts -join "`n")
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing its sessions; sessions bind to the repo dir
foreach ($s in 'nghu', 'ngru', 'ngrbu') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }

$result = Join-Path $run 'result.json'
$title = "NORMS Grubhub, period $(D $p0) - $(D $p1)"
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
