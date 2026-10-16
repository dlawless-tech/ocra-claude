# Task Scheduler entry point, Fridays 11:00. Enters the EZ Cater Fees entries for the Mon-Sun week ended the Sunday before.
# usage: friday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today. done.txt marks a finished week, so a rerun does nothing without -Force.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$sun = $today.AddDays(-(([int]$today.DayOfWeek + 7) % 7)); if ($sun -eq $today) { $sun = $sun.AddDays(-7) }
$mon = $sun.AddDays(-6)
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }

$run = Join-Path $Repo (".scratch\snarfs-ezcater\wk{0:MMdd}" -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'friday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$done = Join-Path $run 'done.txt'
$result = Join-Path $run 'result.json'
if ((Test-Path $done) -and -not $Force) { exit 0 }
Remove-Item -ErrorAction SilentlyContinue $result
Log "week $(D $mon) - $(D $sun); starting claude"

$prompt = @"
/snarfs-ezcater Unattended run for the EZ Cater week $(D $mon) to $(D $sun), entries dated $(D $sun). Follow the skill's Unattended run section.
Work directory: $run
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing its sessions; sessions bind to the work dir. sezu stays open on a code page.
Push-Location $run
foreach ($s in 'sezju', 'sezbu') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }
Pop-Location

$title = "Snarf's EZ Cater Fees, week $(D $mon) - $(D $sun)"
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
$r = Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json
# a run stopped at the EZ code page has no stores and is picked up by the next manual run
if (@($r.stores).Count -or -not $r.note) { Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)" }
