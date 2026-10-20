# Task Scheduler entry point. Once the week's Payroll entry is approved, runs the skill unattended
# to zero 25100 for the Monday-Sunday week that ended last Sunday, then posts to Teams.
# usage: thursday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# Thursday hourly 10:00-18:00 plus Friday 10:00; a run that finds payroll not yet approved writes
# status waiting and the next start tries again. Friday's waiting run posts a card.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

# the Monday-Sunday week that ended before today
$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$sun = $today.AddDays(-[int]$today.DayOfWeek)
if ($sun -eq $today) { $sun = $sun.AddDays(-7) }
$mon = $sun.AddDays(-6)
$f = { param($d) '{0}/{1}/{2}' -f $d.Month, $d.Day, $d.Year }
$weFull = & $f $sun
$run = Join-Path $Repo (".scratch\cucina-colore-tips\wk{0:MMdd}" -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'thursday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
$title = "Cucina Colore Tips, W.E. $weFull"

$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
Log 'starting claude'
$prompt = @"
/cucina-colore-wkly-tips Unattended run for the week $(& $f $mon) through $weFull. Follow the skill's Unattended run section.
Week end (yyyy-MM-dd): $('{0:yyyy-MM-dd}' -f $sun)
Work directory: $run
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; sessions bind to the repo root
& playwright-cli -s=cctu close 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $result)) {
  Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Nothing was confirmed posted. Check the log:', $log)
  exit 1
}
$r = Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json
if ($r.status -eq 'waiting') {
  Log "payroll not approved yet: $($r.note)"
  if ($today.DayOfWeek -ne 'Friday') { exit 0 }
}
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"
& $Notify -Title $title -ResultFile $result
