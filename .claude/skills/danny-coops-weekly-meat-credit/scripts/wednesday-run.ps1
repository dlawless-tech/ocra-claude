# Task Scheduler entry point. Runs the skill unattended for the week that ended last Sunday, then posts to Teams.
# usage: wednesday-run.ps1 [-Date yyyy-MM-dd] [-Force]
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

# the Monday-Sunday week that ended before today
$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$sun = $today.AddDays(-[int]$today.DayOfWeek)
if ($sun -eq $today) { $sun = $sun.AddDays(-7) }
$weFull = '{0}/{1}/{2}' -f $sun.Month, $sun.Day, $sun.Year
$run = Join-Path $Repo (".scratch\danny-coops-meat-credit\wk{0:MMdd}" -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'wednesday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
$title = "Danny & Coops Meat Credit, W.E. $weFull"

$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
Log 'starting claude'
$prompt = @"
/danny-coops-weekly-meat-credit Unattended run for the week ending $weFull. Follow the skill's Unattended run section.
Work directory: $run
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; the session binds to the work directory
Set-Location $run
& playwright-cli -s=mcu close 2>&1 | Out-Null
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"

if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Nothing was confirmed posted. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
