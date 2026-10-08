# Task Scheduler entry point. Waits for the week's ADP files in To Process_Norms, runs the skill unattended,
# files the week folder to Completed_Norms, opens next week's folder, then posts to the payroll channel.
# usage: thursday-run.ps1 [-Mode watch|final] [-Force]
# watch: quiet until all four files are in. final: last check, posts once when files are missing.
param([ValidateSet('watch', 'final')][string]$Mode = 'watch', [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Payroll = 'C:\Users\trici\OCRA\NORMS - General\Payroll'
$Drop = Join-Path $Payroll 'To Process_Norms'
$Done = Join-Path $Payroll 'Completed_Norms'
$Base = Join-Path $Repo '.scratch\norms-payroll'
New-Item -ItemType Directory -Force $Base | Out-Null

# the four files that make a week; skip any still syncing
$want = [ordered]@{ csv = 'WVM_*_PR&TAX.csv'; stat = '*Stat Summ*.pdf'; labor = '*Labor Distribution*.pdf'; detail = '*PAY DETAILS*.xlsx' }
$files = @{}; $missing = @()
foreach ($k in $want.Keys) {
  $f = Get-ChildItem -LiteralPath $Drop -File -Filter $want[$k] | Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-2) } |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($f) { $files[$k] = $f } else { $missing += $want[$k] }
}

if ($missing.Count) {
  $mark = Join-Path $Base ("missing-{0:yyyyMMdd}.txt" -f (Get-Date))
  if ($Mode -eq 'final' -and -not (Test-Path $mark)) {
    Set-Content -Encoding utf8 $mark (Get-Date -Format s)
    & $Notify -Title 'NORMS Payroll: files not all in yet' -Lines @("Missing from To Process_Norms as of $(Get-Date -Format 'ddd M/d h:mm tt'): $($missing -join ', ')", 'Nothing was posted. Drop the files and rerun thursday-run.ps1 -Mode final, or post by hand.')
  }
  exit 0
}

# WVM_<MMddyyyy>_PR&TAX.csv carries the Friday pay date; the week ends the Saturday before
$pay = [datetime]::ParseExact(($files.csv.Name -replace '^WVM_(\d{8})_.*', '$1'), 'MMddyyyy', $null)
$end = $pay.AddDays(-6)
$weFull = '{0}/{1}/{2}' -f $end.Month, $end.Day, $end.Year
$run = Join-Path $Base ("wk{0:MMdd}" -f $end)
New-Item -ItemType Directory -Force $run | Out-Null
if ((Test-Path (Join-Path $run 'done.txt')) -and -not $Force) { exit 0 }
$log = Join-Path $run 'payroll-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
$title = "NORMS Payroll, W.E. $weFull"

# week folder: the one waiting in the drop, else a new one
$week = Get-ChildItem -LiteralPath $Drop -Directory -Filter 'WE *' | Select-Object -First 1
if (-not $week) { $week = New-Item -ItemType Directory (Join-Path $Drop ('WE {0:MM.dd.yy}' -f $end)) }
$checks = Get-ChildItem -LiteralPath $Drop, $week.FullName -File -Filter '*Checks*Vouchers*.pdf' | Select-Object -First 1

# the run works from copies; the originals stay put until filed
$copies = @($files.Values) + @($checks | Where-Object { $_ })
foreach ($f in $copies) { Copy-Item -LiteralPath $f.FullName (Join-Path $run $f.Name) -Force }
$result = Join-Path $run 'result.json'
if (Test-Path $result) { Move-Item -Force $result (Join-Path $run ("result-{0:HHmm}.json" -f (Get-Date))) }
$prior = Get-ChildItem -LiteralPath $Done -Directory -Filter 'WE *' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Log "starting claude ($Mode) for W.E. $weFull"
$prompt = @"
/norms-payroll Unattended run for the week ending $weFull. Follow the skill's Unattended run section.
Work directory: $run
PR&TAX csv: $(Join-Path $run $files.csv.Name)
Stat Summary: $(Join-Path $run $files.stat.Name)
Labor Distribution: $(Join-Path $run $files.labor.Name)
Pay details: $(Join-Path $run $files.detail.Name)
Checks & Vouchers: $(if ($checks) { Join-Path $run $checks.Name } else { 'none this week' })
Prior week folder: $($prior.FullName)
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
$ErrorActionPreference = 'Continue'
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing; the session binds to the work directory
Set-Location $run
& playwright-cli -s=npay close 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'
Set-Content -Encoding utf8 (Join-Path $run 'done.txt') "done $(Get-Date -Format s)"

if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Nothing was confirmed posted, and the files are still in To Process_Norms. Check the log:', $log)
  exit 0
}

# file only an approved entry with all three attachments
$r = Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json
if ($r.status -eq 'approved' -and $r.attached) {
  try {
    foreach ($f in $copies) { if ($f.DirectoryName -ne $week.FullName) { Move-Item -LiteralPath $f.FullName $week.FullName } }
    $dest = Join-Path $Done $week.Name
    if (Test-Path -LiteralPath $dest) { throw "$dest already exists" }
    Move-Item -LiteralPath $week.FullName $Done
    $next = New-Item -ItemType Directory -Force (Join-Path $Drop ('WE {0:MM.dd.yy}' -f $end.AddDays(7)))
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
