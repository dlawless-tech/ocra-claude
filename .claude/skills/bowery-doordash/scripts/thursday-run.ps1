# Task Scheduler entry point, Thursdays every 2 hours 10:00-18:00. Posts the Mon-Sun DoorDash period that ended four days ago, paid today.
# usage: thursday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today's date. One marker per period, so a rerun does nothing without -Force. Posts the result to Teams.
# Stores with no payout yet (or a run with no result) wait in pending.json for the next attempt; one card once all are done or after the 18:00 attempt.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Stores = 'Cookshop', 'Rosie', 'Shuka', 'Vic'
$LastHour = 18

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$thu = $today.AddDays(-(([int]$today.DayOfWeek - 4 + 7) % 7))
$sun = $thu.AddDays(-4); $mon = $sun.AddDays(-6)
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }
function Frag($name) { $Stores | Where-Object { $name -like "*$_*" } | Select-Object -First 1 }

$run = Join-Path $Repo (".scratch\bowery-doordash\wk{0:MMdd}" -f $sun)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'thursday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$marker = Join-Path $run 'started.txt'
$pending = Join-Path $run 'pending.json'
$done = Join-Path $run 'result-done.json'
$result = Join-Path $run 'result.json'
$retry = (Test-Path $marker) -and (Test-Path $pending)
if ((Test-Path $marker) -and -not $retry -and -not $Force) { exit 0 }
if (-not $retry) {
  Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)"
  Remove-Item -ErrorAction SilentlyContinue $done
}
$todo = if ($retry) { @(Get-Content -Raw $pending | ConvertFrom-Json) } else { $Stores }
Log "period $(D $mon) - $(D $sun); $(if ($retry) { 'retry' } else { 'first' }) attempt for $($todo -join ', '); starting claude"

$prompt = @"
/bowery-doordash Unattended run for the DoorDash period $(D $mon) to $(D $sun). Follow the skill's Unattended run section.
Work directory: $run
Entry date: $(D $sun)
Payout date: $(D $thu)
Stores: $($todo -join ', ')
"@
Remove-Item -ErrorAction SilentlyContinue $result
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing its sessions; sessions bind to the work dir
Set-Location $run
foreach ($s in 'ddu', 'bdu', 'bdbu', 'bpdf') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }
$ErrorActionPreference = 'Stop'

$title = "Bowery DoorDash, week ending $(D $sun)"
$r = if (Test-Path $result) { Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json } else { $null }
$prior = if (Test-Path $done) { Get-Content -Raw -Encoding utf8 $done | ConvertFrom-Json } else { $null }
$attempt = if ($r) { @($r.stores) } else { @($todo | ForEach-Object { [pscustomobject]@{ store = $_; status = 'failed'; warnings = @('attempt ended without a result file, see thursday-run.log') } }) }
$wait = if ($r) { @($attempt | Where-Object { $_.status -eq 'no-payout' } | ForEach-Object { Frag $_.store }) } else { @($todo) }

# merge: finished stores accumulate in result-done.json
$base = if ($r) { $r } elseif ($prior) { $prior } else { [pscustomobject]@{ period = "$(D $mon) - $(D $sun)"; stores = @() } }
$keptPrior = if ($prior) { @($prior.stores) } else { @() }
$last = (Get-Date).Hour -ge $LastHour

if ($wait.Count -and -not $last) {
  $base.stores = $keptPrior + @($attempt | Where-Object { (Frag $_.store) -notin $wait })
  $base | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $done
  ConvertTo-Json -InputObject @($wait) | Set-Content -Encoding utf8 $pending
  Remove-Item -ErrorAction SilentlyContinue $result
  Log "no payout yet for $($wait -join ', '); next attempt in 2 hours"
  exit 0
}

Remove-Item -ErrorAction SilentlyContinue $pending
$base.stores = $keptPrior + $attempt
$base | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $result
if (-not $r -and -not $keptPrior.Count) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
