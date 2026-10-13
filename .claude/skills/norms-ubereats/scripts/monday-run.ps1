# Task Scheduler entry point, Mondays 17:00. Posts the Uber Eats pay period that ended the Sunday before.
# usage: monday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today's date. One marker per period, so a rerun does nothing without -Force.
# Logs into Uber first, tagging the code contact in Teams, and waits up to an hour for the code. Posts the result to Teams.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Bash = 'C:\Program Files\Git\bin\bash.exe'

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$back = [int]$today.DayOfWeek; if ($back -eq 0) { $back = 7 }
$p1 = $today.AddDays(-$back); $p0 = $p1.AddDays(-6); $sat = $p1.AddDays(-1)
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }
$period = "$(D $p0) - $(D $p1)"
$title = "NORMS Uber Eats, pay period $period"

$run = Join-Path $Repo (".scratch\norms-ubereats\wk{0:MMdd}" -f $sat)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'monday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$marker = Join-Path $run 'started.txt'
if ((Test-Path $marker) -and -not $Force) { exit 0 }
Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)"
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'

Log "period $period; Uber login"
$env:NOTIFY = '1'; $env:WAIT = '60'; $env:PERIOD = $period
& $Bash .claude/skills/norms-ubereats/scripts/uber-login.sh nue 2>&1 | Out-File -Append -Encoding utf8 $log
$login = $LASTEXITCODE
Log "uber-login exited $login"
if ($login -ne 0) {
  & playwright-cli -s=nue close 2>&1 | Out-Null
  & $Notify -Title "$title FAILED" -Mention code -Lines @($(if ($login -eq 2) { 'No Uber Eats code was entered within 60 minutes, so nothing was posted.' } else { 'The Uber Eats login failed, so nothing was posted.' }), "Log: $log", 'Rerun: monday-run.ps1 -Force')
  exit 1
}

$prompt = @"
/norms-ubereats Unattended run for the Uber Eats pay period $(D $p0) to $(D $p1). Follow the skill's Unattended run section.
Work directory: $run
Entry date (ENTRY_DATE): $(D $sat)
The Uber session nue is already logged in.
"@
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing its sessions; sessions bind to the repo dir
foreach ($s in 'nue', 'nur', 'nurb') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }

$result = Join-Path $run 'result.json'
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Mention code -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -Mention done -ResultFile $result
