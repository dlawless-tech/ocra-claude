# Task Scheduler entry point, Mondays 5:00. Posts every unmatched Stripe line on 1123, then reports to Teams.
# usage: monday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today. -Force reruns a day already marked done.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$day = '{0}/{1}/{2}' -f $today.Month, $today.Day, $today.Year
$run = Join-Path $Repo (".scratch\dlena-stripe-deposits\run{0:MMdd}" -f $today)
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'monday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
$result = Join-Path $run 'result.json'
Remove-Item -ErrorAction SilentlyContinue $result
Log "run $day; starting claude"

$prompt = @"
/dlena-stripe-deposits Unattended run for $day. Follow the skill's Unattended run section.
Work directory: $run
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
$r = if (Test-Path $result) { Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json } else { $null }
# backstop for a run that died before closing; sessions bind to the work dir. A run waiting on a sign-in keeps its Stripe window open.
Set-Location $run
$close = if ($r -and $r.note -match 'sign-in') { , 'dlu' } else { 'dlu', 'stu' }
foreach ($s in $close) { & playwright-cli "-s=$s" close 2>&1 | Out-Null }
$ErrorActionPreference = 'Stop'

$title = "dLena Stripe deposits $day"
if (-not $r) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
if ($r.note -match 'sign-in') {
  & $Notify -Title "$title waiting on Stripe sign-in" -Lines @($r.note, 'Sign in to the open Stripe window, then run monday-run.ps1 again')
  exit 0
}
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"
& $Notify -Title $title -ResultFile $result
