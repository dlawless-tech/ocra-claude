# Task Scheduler entry point. Started by the Bowery bank downloads run once the week's download is
# complete; runs the skill unattended, then posts to the Bank Activity channel.
# usage: tripleseat-run.ps1 [-Force] [-WeekEnding <yyyy-MM-dd>]
param([switch]$Force, [string]$WeekEnding)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

$sun = if ($WeekEnding) { [datetime]::ParseExact($WeekEnding, 'yyyy-MM-dd', $null) } else { (Get-Date).Date.AddDays(-[int](Get-Date).DayOfWeek) }
$weFull = '{0}/{1}/{2}' -f $sun.Month, $sun.Day, $sun.Year
$run = Join-Path $Repo ('.scratch\bowery-tripleseat\wk{0:MMdd}' -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }

# trigger: the week's bank download ends on END with no retrieve error
$rl = Join-Path $Repo ('.scratch\bowery-bank-downloads\wk{0:MMdd}\retrieve.log' -f $sun)
$lines = @(Get-Content -Encoding utf8 $rl -ErrorAction SilentlyContinue)
$bankDone = ($lines | Where-Object { $_ -match '^\d+ END' }) -and -not ($lines | Where-Object { $_ -match 'RETRIEVED: .*\{' -and $_ -notmatch '"error":null,"result":1' })
if (-not $bankDone -and -not $Force) { exit 0 }

$log = Join-Path $run 'run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
Set-Content -Encoding utf8 $done "started $(Get-Date -Format s)"
Log "starting claude for W.E. $weFull"
$prompt = @"
/bowery-tripleseat-pay Unattended run. Follow the skill's Unattended run section.
Work directory: $run
Week ending: $('{0:yyyy-MM-dd}' -f $sun)
Today: $(Get-Date -Format 'yyyy-MM-dd')
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; sessions bind to the work directory
Set-Location $run
& playwright-cli -s=btsu close 2>&1 | Out-Null
& playwright-cli -s=tspu close 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"

if (-not (Test-Path $result)) {
  & $Notify -Title 'Bowery Tripleseat Pay FAILED' -Lines @("The W.E. $weFull run ended without a result file. Nothing was confirmed posted. Check the log:", $log)
  exit 1
}
& $Notify -Title "Bowery Tripleseat Pay, W.E. $weFull" -ResultFile $result
