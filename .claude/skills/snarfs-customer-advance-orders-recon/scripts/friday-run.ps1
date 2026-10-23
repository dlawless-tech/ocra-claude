# Task Scheduler entry point, Fridays 11:00. Reconciles 20100 for the Monday-Sunday week ended last Sunday, carrying in the prior week's open orders, and posts the result to the TPD channel. Posts no entries.
# usage: friday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today's date. One marker per week, so a rerun does nothing without -Force.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Bash = 'C:\Program Files\Git\bin\bash.exe'

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$end = $today.AddDays(-(([int]$today.DayOfWeek + 6) % 7 + 1))
$glStart = $end.AddDays(-6)
$toastFrom = $glStart
$prior = Join-Path $Repo (".scratchsnarfs-advance-orderswk{0:MMdd}econ.json" -f $end.AddDays(-7))
function D($x) { '{0}/{1}/{2}' -f $x.Month, $x.Day, $x.Year }
function Iso($x) { $x.ToString('yyyy-MM-dd') }

$run = Join-Path $Repo (".scratch\snarfs-advance-orders\wk{0:MMdd}" -f $end)
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'friday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
$title = "Snarf's customer advance orders, 20100 through $(D $end)"

$marker = Join-Path $run 'started.txt'
if (-not (Test-Path $prior)) { & $Notify -Title "$title not run" -Lines @("No prior week recon at $prior. Run the missing week first."); exit 1 }
if ((Test-Path $marker) -and -not $Force) { exit 0 }
Set-Content -Encoding utf8 $marker "started $(Get-Date -Format s)"

# sessions bind to the working directory: they live in the work directory, and claude runs from the repo root
function Cd($p) { Set-Location $p; [Environment]::CurrentDirectory = $p }
Cd $run
$ErrorActionPreference = 'Continue'
Log "Toast sign-in"
$login = (& $Bash "$PSScriptRoot/toast-login.sh" sntu 3600 2>&1) -join ' '
$code = $LASTEXITCODE
Log "toast-login exited $code $login"
if ($code -ne 0) {
  if ($code -eq 2) { & $Notify -Title "$title not run" -Code -Ask 'no Toast code came in within 60 minutes. Sign in to Toast, then run friday-run.ps1 -Force.' -Lines @('The recon did not run.') }
  else { & $Notify -Title "$title FAILED" -Code -Lines @("Toast sign-in: $login", $log) }
  & playwright-cli -s=sntu close 2>&1 | Out-Null
  exit 1
}

$prompt = @"
/snarfs-customer-advance-orders-recon Unattended run. Follow the skill's Unattended run section.
Work directory: $run
End date: $(Iso $end)
GL start: $(D $glStart)
Toast from: $(Iso $toastFrom)
Prior recon: $prior
"@
Log "starting claude"
Cd $Repo
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
# backstop for a run that died before closing its sessions
Cd $run
foreach ($s in 'snfu', 'sntu') { & playwright-cli "-s=$s" close 2>&1 | Out-Null }

$result = Join-Path $run 'result.json'
if (-not (Test-Path $result)) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
& $Notify -Title $title -ResultFile $result
Log "posted to Teams"
