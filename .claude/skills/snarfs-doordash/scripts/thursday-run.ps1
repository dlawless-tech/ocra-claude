# Task Scheduler entry point: Thu 14:00, retry Fri 8:00. Posts the Mon-Sun week ended the Sunday before.
# usage: thursday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today. done.txt marks a posted week, so later triggers do nothing without -Force.
# A week whose Sunday payouts are not out yet waits quietly for Friday; the Friday attempt is final and always reports.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$sun = $today.AddDays(-(([int]$today.DayOfWeek + 7) % 7)); if ($sun -eq $today) { $sun = $sun.AddDays(-7) }
$mon = $sun.AddDays(-6)
$final = $today.DayOfWeek -ne 'Thursday'
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }

$run = Join-Path $Repo (".scratch\snarfs-doordash\wk{0:MMdd}" -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'thursday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$done = Join-Path $run 'done.txt'
$result = Join-Path $run 'result.json'
if ((Test-Path $done) -and -not $Force) { exit 0 }
Log "week $(D $mon) - $(D $sun); $(if ($final) { 'final' } else { 'Thursday' }) attempt; starting claude"

$prompt = @"
/snarfs-doordash Unattended run for the DoorDash week $(D $mon) to $(D $sun). Follow the skill's Unattended run section.
Work directory: $run
Entry date: $(D $sun)
Final attempt: $(if ($final) { 'yes' } else { 'no' })
"@
Remove-Item -ErrorAction SilentlyContinue $result
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing its sessions; sessions bind to the work dir
Set-Location $run
foreach ($s in 'sddu', 'sndu', 'spdf') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }
$ErrorActionPreference = 'Stop'

$title = "Snarf's DoorDash, week ending $(D $sun)"
$r = if (Test-Path $result) { Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json } else { $null }
if ($r -and $r.waiting -and -not $final) { Log "Sunday payouts not out yet; waiting for Friday"; exit 0 }
if (-not $r) {
  if (-not $final) { Log 'no result file; waiting for Friday'; exit 0 }
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"
& $Notify -Title $title -ResultFile $result
