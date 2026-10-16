# Task Scheduler entry point, Tuesdays 13:00. Posts the Uber Eats Mon-Sun week that ended the Sunday before.
# usage: tuesday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today. started.txt marks a week, so a rerun does nothing without -Force.
# Logs into Uber first, tagging the code contact in Teams if a code is needed, and waits up to an hour for it.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Bash = 'C:\Program Files\Git\bin\bash.exe'

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$back = [int]$today.DayOfWeek; if ($back -eq 0) { $back = 7 }
$sun = $today.AddDays(-$back); $mon = $sun.AddDays(-6)
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }
$period = "$(D $mon) - $(D $sun)"
$title = "Snarf's Uber Eats, week ending $(D $sun)"

$run = Join-Path $Repo (".scratch\snarfs-ubereats\wk{0:MMdd}" -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'tuesday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$marker = Join-Path $run 'started.txt'
if ((Test-Path $marker) -and -not $Force) { exit 0 }
Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)"
# sessions bind to the folder they are opened from
Set-Location $run
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'

Log "week $period; Uber login"
$env:NOTIFY = '1'; $env:WAIT = '60'; $env:PERIOD = $period
& $Bash "$PSScriptRoot/uber-login.sh" subu 2>&1 | Out-File -Append -Encoding utf8 $log
$login = $LASTEXITCODE
Log "uber-login exited $login"
if ($login -ne 0) {
  & playwright-cli -s=subu close 2>&1 | Out-Null
  & $Notify -Title "$title FAILED" -Mention code -Lines @($(if ($login -eq 2) { 'No Uber Eats code was entered within 60 minutes, so nothing was posted.' } else { 'The Uber Eats login failed, so nothing was posted.' }), "Log: $log", 'Rerun: tuesday-run.ps1 -Force')
  exit 1
}

$prompt = @"
/snarfs-ubereats Unattended run for the Uber Eats week $(D $mon) to $(D $sun). Follow the skill's Unattended run section.
Work directory: $run
Entry date: $(D $sun)
The Uber session subu is already logged in.
"@
$result = Join-Path $run 'result.json'
Remove-Item -ErrorAction SilentlyContinue $result
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing its sessions
foreach ($s in 'subu', 'snuu') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }

if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Mention code -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -Mention done -ResultFile $result
