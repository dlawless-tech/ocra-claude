# Task Scheduler entry point, Thursdays 4:00 with a 10:00 retry. Posts the Mon-Sun DoorDash period that ended four days ago, paid today.
# usage: thursday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today's date. One marker per period, so a rerun does nothing without -Force. Posts the result to Teams.
# Before 10:00, stores with no payout yet (or a run with no result) are left for the 10:00 retry, and Teams waits for it.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Stores = @((Get-Content -Raw "$PSScriptRoot\stores.json" | ConvertFrom-Json).PSObject.Properties.Value | Sort-Object)

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$thu = $today.AddDays(-(([int]$today.DayOfWeek - 4 + 7) % 7))
$sun = $thu.AddDays(-4); $mon = $sun.AddDays(-6)
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }
function Frag($name) { $Stores | Where-Object { $_ -eq $name } | Select-Object -First 1 }

$run = Join-Path $Repo (".scratch\norms-doordash\wk{0:MMdd}" -f $sun.AddDays(-1))
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'thursday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

$marker = Join-Path $run 'started.txt'
$pending = Join-Path $run 'pending.json'
$first = Join-Path $run 'result-first.json'
$result = Join-Path $run 'result.json'
$retry = (Test-Path $marker) -and (Test-Path $pending)
if ((Test-Path $marker) -and -not $retry -and -not $Force) { exit 0 }
if (-not $retry) { Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)" }
$todo = if ($retry) { @(Get-Content -Raw $pending | ConvertFrom-Json) } else { $Stores }
Log "period $(D $mon) - $(D $sun); $(if ($retry) { 'retry' } else { 'first' }) attempt for $($todo -join ', '); starting claude"

$prompt = @"
/norms-doordash Unattended run for the DoorDash period $(D $mon) to $(D $sun). Follow the skill's Unattended run section.
Work directory: $run
Entry date: $(D $sun.AddDays(-1))
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
foreach ($s in 'nddu', 'nru', 'nrbu') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }
$ErrorActionPreference = 'Stop'

$title = "NORMS DoorDash, week $(D $mon) - $(D $sun)"
$r = if (Test-Path $result) { Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json } else { $null }

if (-not $retry -and (Get-Date).Hour -lt 10) {
  $wait = if ($r) { @($r.stores | Where-Object { $_.status -eq 'no-payout' } | ForEach-Object { Frag $_.store }) } else { $Stores }
  if ($wait.Count) {
    if ($r) { Move-Item -Force $result $first }
    ConvertTo-Json -InputObject @($wait) | Set-Content -Encoding utf8 $pending
    Log "no payout yet for $($wait -join ', '); retrying at 10:00"
    exit 0
  }
}

if ($retry) {
  Remove-Item $pending
  if (Test-Path $first) {
    $f = Get-Content -Raw -Encoding utf8 $first | ConvertFrom-Json
    $kept = @($f.stores | Where-Object { (Frag $_.store) -notin $todo })
    if ($r) {
      $r.stores = $kept + @($r.stores)
    } else {
      $f.stores = $kept + @($todo | ForEach-Object { [pscustomobject]@{ store = $_; status = 'failed'; warnings = @('10:00 retry ended without a result file, see thursday-run.log') } })
      $r = $f
    }
    $r | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $result
  }
}

if (-not $r) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
