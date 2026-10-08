# Task Scheduler entry point. Waits for the Support Center ADP files in To Process SC, runs the skill unattended,
# files the week folder to Completed_SC, opens the next pay's folder, then posts to the payroll channel.
# usage: thursday-run.ps1 [-Mode watch|final] [-Force]
# watch: quiet until the files are in. final: last check, posts once when files are missing.
param([ValidateSet('watch', 'final')][string]$Mode = 'watch', [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Payroll = 'C:\Users\trici\OCRA\NORMS - General\Payroll'
$Drop = Join-Path $Payroll 'To Process SC'
$Done = Join-Path $Payroll 'Completed_SC'
$Base = Join-Path $Repo '.scratch\norms-payroll-sc'
New-Item -ItemType Directory -Force $Base | Out-Null

# the files that make a pay; skip any still syncing. A catch-up pay can carry more than one csv.
$fresh = { $_.LastWriteTime -lt (Get-Date).AddMinutes(-2) }
$csvs = @(Get-ChildItem -LiteralPath $Drop -File -Filter 'WVJ_*_PR&TAX*.csv' | Where-Object $fresh | Sort-Object Name)
$stat = Get-ChildItem -LiteralPath $Drop -File -Filter '*Stat Summ*.pdf' | Where-Object $fresh | Select-Object -First 1
$labor = Get-ChildItem -LiteralPath $Drop -File -Filter '*Labor Distribution*.pdf' | Where-Object $fresh | Select-Object -First 1
$missing = @()
if (-not $csvs.Count) { $missing += 'WVJ_<paydate>_PR&TAX.csv' }
if (-not $stat) { $missing += 'WVJ Stat Summary' }
if (-not $labor) { $missing += 'WVJ Labor Distribution' }

if ($missing.Count) {
  $mark = Join-Path $Base ("missing-{0:yyyyMMdd}.txt" -f (Get-Date))
  if ($Mode -eq 'final' -and -not (Test-Path $mark)) {
    Set-Content -Encoding utf8 $mark (Get-Date -Format s)
    & $Notify -Title 'NORMS Payroll - Support Center: files not all in yet' -Lines @("Missing from To Process SC as of $(Get-Date -Format 'ddd M/d h:mm tt'): $($missing -join ', ')", 'Nothing was posted. Drop the files and rerun thursday-run.ps1 -Mode final, or post by hand.')
  }
  exit 0
}

# WVJ_<MMddyyyy>_PR&TAX.csv carries the Friday pay date; every csv in a drop names the same one
$dates = @($csvs | ForEach-Object { $_.Name -replace '^WVJ_(\d{8})_.*', '$1' } | Select-Object -Unique)
if ($dates.Count -ne 1) {
  $mark = Join-Path $Base ("mixed-{0:yyyyMMdd}.txt" -f (Get-Date))
  if (-not (Test-Path $mark)) {
    Set-Content -Encoding utf8 $mark (Get-Date -Format s)
    & $Notify -Title 'NORMS Payroll - Support Center: mixed pay dates' -Lines @("To Process SC holds csvs for more than one pay date: $($csvs.Name -join ', '). Nothing was posted.")
  }
  exit 0
}
$pay = [datetime]::ParseExact($dates[0], 'MMddyyyy', $null)
$payFull = '{0}/{1}/{2}' -f $pay.Month, $pay.Day, $pay.Year
$run = Join-Path $Base ("pd{0:MMdd}" -f $pay)
New-Item -ItemType Directory -Force $run | Out-Null
if ((Test-Path (Join-Path $run 'done.txt')) -and -not $Force) { exit 0 }
$log = Join-Path $run 'payroll-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
$title = "NORMS Payroll - Support Center, pay date $payFull"

# week folder: the one waiting in the drop, else a new one named for the Saturday before the pay date
$week = Get-ChildItem -LiteralPath $Drop -Directory -Filter 'WE *' | Select-Object -First 1
if (-not $week) { $week = New-Item -ItemType Directory (Join-Path $Drop ('WE {0:MM.dd.yy}' -f $pay.AddDays(-6))) }
$checks = Get-ChildItem -LiteralPath $Drop, $week.FullName -File -Filter '*Checks*Vouchers*.pdf' | Select-Object -First 1

# the run works from copies; the originals stay put until filed
$copies = @($csvs) + @($stat, $labor) + @($checks | Where-Object { $_ })
foreach ($f in $copies) { Copy-Item -LiteralPath $f.FullName (Join-Path $run $f.Name) -Force }
$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
$prior = Get-ChildItem -LiteralPath $Done -Directory -Filter 'WE *' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Log "starting claude ($Mode) for pay date $payFull"
$prompt = @"
/norms-payroll-sc Unattended run for pay date $payFull. Follow the skill's Unattended run section.
Work directory: $run
PR&TAX csv: $(($csvs | ForEach-Object { Join-Path $run $_.Name }) -join '; ')
Stat Summary: $(Join-Path $run $stat.Name)
Labor Distribution: $(Join-Path $run $labor.Name)
Checks & Vouchers: $(if ($checks) { Join-Path $run $checks.Name } else { 'none this pay' })
Prior pay folder: $($prior.FullName)
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; the session binds to the work directory
Set-Location $run
& playwright-cli -s=npsc close 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'
Set-Content -Encoding utf8 (Join-Path $run 'done.txt') "done $(Get-Date -Format s)"

if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Nothing was confirmed posted, and the files are still in To Process SC. Check the log:', $log)
  exit 0
}

# file only an approved entry with every attachment
$r = Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json
if ($r.status -eq 'approved' -and $r.attached) {
  try {
    foreach ($f in $copies) { if ($f.DirectoryName -ne $week.FullName) { Move-Item -LiteralPath $f.FullName $week.FullName } }
    $dest = Join-Path $Done $week.Name
    if (Test-Path -LiteralPath $dest) { throw "$dest already exists" }
    Move-Item -LiteralPath $week.FullName $Done
    $next = New-Item -ItemType Directory -Force (Join-Path $Drop ('WE {0:MM.dd.yy}' -f $pay.AddDays(8)))
    $r | Add-Member -Force filed $true
    $r | Add-Member -Force filedTo $dest
    $r | Add-Member -Force nextFolder $next.Name
  } catch {
    $r | Add-Member -Force filed $false
    $r.warnings = @($r.warnings) + "Filing failed: $($_.Exception.Message)"
  }
  $r | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 $result
}
& $Notify -Title $title -ResultFile $result
