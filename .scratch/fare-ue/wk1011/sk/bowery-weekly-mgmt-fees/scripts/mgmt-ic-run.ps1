# Task Scheduler entry point. Finds a dropped workbook, runs Management Fees then Intercompany Transfers unattended on it,
# files it to Completed once both are approved and attached, then posts one card to Teams.
# usage: mgmt-ic-run.ps1 [-Force] [-File <xlsx>]
param([switch]$Force, [string]$File)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Drop = 'C:\Users\trici\OCRA\Bowery Group - General\Journal Entries\Mgmt Fees & Intercompany Transfers'
$Base = Join-Path $Repo '.scratch\bowery-mgmt-fees-ic'
New-Item -ItemType Directory -Force $Base | Out-Null

# skip a file still syncing and Excel lock files
if ($File) { $found = @(Get-Item -LiteralPath $File) } else {
  $found = @(Get-ChildItem -LiteralPath $Drop -File -Filter '*.xlsx' |
    Where-Object { $_.Name -notlike '~$*' -and $_.LastWriteTime -lt (Get-Date).AddMinutes(-2) })
}
if (-not $found.Count) { exit 0 }

if ($found.Count -gt 1) {
  $mark = Join-Path $Base ("several-{0:yyyyMMdd}.txt" -f (Get-Date))
  if (-not (Test-Path $mark)) {
    Set-Content -Encoding utf8 $mark (Get-Date -Format s)
    & $Notify -Title 'Bowery Mgmt Fees & IC Transfers: more than one workbook waiting' -Lines (@('Nothing was posted. Leave one workbook at the top of the folder:') + @($found | ForEach-Object { "- $($_.Name)" }))
  }
  exit 0
}

$f = $found[0]
# one run per file version; a replaced workbook runs again
$run = Join-Path $Base ('run-{0:yyyyMMdd-HHmmss}' -f $f.LastWriteTime)
New-Item -ItemType Directory -Force $run | Out-Null
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
$log = Join-Path $run 'run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }

# the runs work from a copy; the original stays put until it is filed
$copy = Join-Path $run $f.Name
Copy-Item -LiteralPath $f.FullName $copy -Force
$mfResult = Join-Path $run 'mf-result.json'
$icResult = Join-Path $run 'ic-result.json'
foreach ($x in $mfResult, $icResult) { if (Test-Path $x) { Move-Item -Force $x ($x -replace '\.json$', ("-{0:HHmm}.json" -f (Get-Date))) } }
Set-Content -Encoding utf8 $done "started $(Get-Date -Format s)"

function RunSkill($skill, $session, $resultName) {
  Log "starting $skill on $($f.FullName)"
  $prompt = @"
/$skill Unattended run. Follow the skill's Unattended run section.
Work directory: $run
Workbook copy: $copy
Original file: $($f.FullName)
Result file: $(Join-Path $run $resultName)
Today: $(Get-Date -Format 'M/d/yyyy')
"@
  Set-Location $Repo
  # 5.1 turns native stderr into errors; Stop would kill the run
  $ErrorActionPreference = 'Continue'
  & $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
  Log "$skill exited $LASTEXITCODE"
  # backstop for a run that died before closing; the session binds to the work directory
  Set-Location $run
  & playwright-cli -s=$session close 2>&1 | Out-Null
  $ErrorActionPreference = 'Stop'
}

RunSkill 'bowery-weekly-mgmt-fees' 'mfu' 'mf-result.json'
RunSkill 'bowery-weekly-ic-transfers' 'icu' 'ic-result.json'
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"

$mf = if (Test-Path $mfResult) { Get-Content -Raw -Encoding utf8 $mfResult | ConvertFrom-Json }
$ic = if (Test-Path $icResult) { Get-Content -Raw -Encoding utf8 $icResult | ConvertFrom-Json }

# file only when both entries are approved with the workbook attached
$filed = $false; $fileNote = ''
if ($mf -and $ic -and $mf.status -eq 'approved' -and $ic.status -eq 'approved' -and $mf.attached -and $ic.attached) {
  $target = Join-Path $Drop "Completed\$($f.Name)"
  if (Test-Path -LiteralPath $target) { $fileNote = "Completed already holds $($f.Name); the workbook stays in the folder." }
  else {
    try { Move-Item -LiteralPath $f.FullName $target; $filed = -not (Test-Path -LiteralPath $f.FullName) }
    catch { $fileNote = "Move to Completed failed: $_" }
  }
}
Log "filed $filed $fileNote"

$we = @($mf.weekEnding, $ic.weekEnding | Where-Object { $_ })[0]
& $Notify -Title $(if ($we) { "Bowery Mgmt Fees & IC Transfers, W.E. $we" } else { 'Bowery Mgmt Fees & IC Transfers FAILED' }) `
  -MfFile $(if ($mf) { $mfResult }) -IcFile $(if ($ic) { $icResult }) -Filed:$filed -FileNote $fileNote -Log $log -Workbook $f.Name
if (-not ($mf -and $ic)) { exit 1 }
