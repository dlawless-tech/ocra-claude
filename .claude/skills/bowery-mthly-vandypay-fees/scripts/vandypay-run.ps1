# Task Scheduler entry point. From the 4th of each month, runs the skill unattended for the month
# just ended, then posts the confirmation to Teams.
# usage: vandypay-run.ps1 [-Month <yyyy-MM>] [-Force]
# Daily 6 AM trigger; exits quietly before the 4th or once the month is done, so a missed 4th catches up.
param([string]$Month, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"

$today = (Get-Date).Date
if (-not $Month -and $today.Day -lt 4) { exit 0 }
$first = if ($Month) { [datetime]::ParseExact($Month, 'yyyy-MM', $null) } else { $today.AddDays(1 - $today.Day).AddMonths(-1) }
$end = $first.AddMonths(1).AddDays(-1)

$run = Join-Path $Repo (".scratch\bowery-vandypay\{0:yyyy-MM}" -f $first)
New-Item -ItemType Directory -Force $run | Out-Null
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
$log = Join-Path $run 'run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
Set-Content -Encoding utf8 $done "started $(Get-Date -Format s)"
Log ("starting claude for {0:MM/yyyy}" -f $first)
$prompt = @"
/bowery-mthly-vandypay-fees Unattended run. Follow the skill's Unattended run section.
Work directory: $run
Month: $('{0:MM}' -f $first)
Year: $('{0:yyyy}' -f $first)
Month end: $('{0:M/d/yyyy}' -f $end)
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; sessions bind to the work directory
Set-Location $run
foreach ($s in 'vpu', 'vyu') { & playwright-cli -s=$s close 2>&1 | Out-Null }
$ErrorActionPreference = 'Stop'
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"

$title = "Bowery VandyPay Fees {0:MMM yyyy}" -f $first
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Nothing was confirmed posted. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
