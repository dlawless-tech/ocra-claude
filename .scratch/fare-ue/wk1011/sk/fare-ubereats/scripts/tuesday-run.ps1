# Task Scheduler entry point, Tuesdays 15:15. Posts the Monday to Sunday week that ended two days before, without waiting for the deposit.
# usage: tuesday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today's date. One marker per week, so a rerun does nothing without -Force.
# Logs into Uber first, tagging the contact in Teams for the code, and waits up to an hour. Posts the result to Teams.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Skills = Join-Path $Repo '.claude\skills'
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Bash = 'C:\Program Files\Git\bin\bash.exe'

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$back = [int]$today.DayOfWeek; if ($back -eq 0) { $back = 7 }
$p1 = $today.AddDays(-$back); $p0 = $p1.AddDays(-6); $prev = $p1.AddDays(-7)
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }
function Iso($x) { $x.ToString('yyyy-MM-dd') }
$period = "$(D $p0) - $(D $p1)"
$title = "FARE Uber Eats, week $period"

$base = Join-Path $Repo '.scratch\fare-ue'
$run = Join-Path $base ("wk{0:MMdd}" -f $p1)
$prevIds = Join-Path $base ("wk{0:MMdd}\ids-$(Iso $prev).txt" -f $prev)
$outIds = Join-Path $run "ids-$(Iso $p1).txt"
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'tuesday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$marker = Join-Path $run 'started.txt'
if ((Test-Path $marker) -and -not $Force) { exit 0 }
Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)"

# private copy: other sessions edit these scripts mid run
$sk = Join-Path $run 'sk'
foreach ($n in 'fare-ubereats', 'bowery-ubereats', 'danny-coops-payroll', 'bowery-weekly-mgmt-fees') {
  New-Item -ItemType Directory -Force "$sk\$n" | Out-Null
  Copy-Item -Recurse -Force "$Skills\$n\scripts" "$sk\$n\"
}
# sessions bind to the dir they were opened from
Set-Location $run
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'

Log "week $period; Uber login"
$env:NOTIFY = '1'; $env:WAIT = '60'; $env:PERIOD = $period
& $Bash sk/fare-ubereats/scripts/uber-login.sh fue-uber 2>&1 | Out-File -Append -Encoding utf8 $log
$login = $LASTEXITCODE
Log "uber-login exited $login"
if ($login -ne 0) {
  & playwright-cli -s=fue-uber close 2>&1 | Out-Null
  & $Notify -Title "$title FAILED" -Mention code -Lines @($(if ($login -eq 2) { 'No Uber Eats code was entered within 60 minutes, so nothing was posted.' } else { 'The Uber Eats login failed, so nothing was posted.' }), "Log: $log", 'Rerun: tuesday-run.ps1 -Force')
  exit 1
}

$prompt = @"
/fare-ubereats Unattended run for the week $(D $p0) to $(D $p1), entries dated $(D $p1). Follow the skill's Unattended run section.
Work directory: $run
Scripts copy: $sk\fare-ubereats\scripts
Week start and end: $(Iso $p0) $(Iso $p1)
Prior week's ids: $prevIds
Out ids: $outIds
The Uber session fue-uber is already logged in.
"@
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing its sessions
foreach ($s in 'fue-uber', 'fue-r365') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }

$result = Join-Path $run 'result.json'
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Mention done -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -Mention done -ResultFile $result
