# Unattended weekly recon, started by the dLena Stripe deposits Tuesday run once its payouts are posted.
# Opens Toast on the saved profile (tagging Tricia if it needs a sign-in), runs the skill headless
# through last Sunday, then reports to the dLena Bank Activity channel tagging Tricia.
# usage: weekly-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today. -Force reruns a day already marked done.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = (Resolve-Path "$PSScriptRoot\..\..\dlena-stripe-deposits\scripts\notify-teams.ps1").Path
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Bash = "$env:ProgramFiles\Git\bin\bash.exe"

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$sun = $today.AddDays(-$(if ($today.DayOfWeek -eq 'Sunday') { 7 } else { [int]$today.DayOfWeek }))
$day = '{0}/{1}/{2}' -f $today.Month, $today.Day, $today.Year
$through = '{0}/{1}/{2}' -f $sun.Month, $sun.Day, $sun.Year
$run = Join-Path $Repo (".scratch\dlena-event-deposit-recon\run{0:MMdd}" -f $today)
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'weekly-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
$result = Join-Path $run 'result.json'
Remove-Item -ErrorAction SilentlyContinue $result
$title = "dLena event deposit recon through $through"

# sessions bind to the work dir; tsu stays open for claude
Set-Location $run
$ErrorActionPreference = 'Continue'
Log "run $day through $through; Toast sign-in"
$login = (& $Bash "$PSScriptRoot/toast-login.sh" tsu 1800 2>&1) -join ' '
$code = $LASTEXITCODE
Log "toast-login exited $code $login"
if ($code -ne 0) {
  $ErrorActionPreference = 'Stop'
  if ($code -eq 2) { & $Notify -Title "$title waiting on Toast sign-in" -Ask 'sign in to the open Toast window, then run weekly-run.ps1 again.' -Lines @('No sign-in within 30 minutes.') }
  else { & $Notify -Title "$title FAILED" -Lines @("Toast sign-in: $login", $log) }
  exit 1
}

Log 'starting claude'
$prompt = @"
/dlena-weekly-event-deposit-recon Unattended run for $day, through $through. Follow the skill's Unattended run section.
Work directory: $run
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
$r = if (Test-Path $result) { Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json } else { $null }
# backstop for a run that died before closing; tsu keeps the profile signed in
Set-Location $run
& playwright-cli -s=dru close 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'

if (-not $r) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"

function N($x) { '{0:N2}' -f [double]$x }
$ok = -not $r.note
$lines = @()
foreach ($w in @($r.weeks)) {
  if (-not $w) { continue }
  $lines += "- $($w.tab) ($($w.from) to $($w.to)): $($w.status), tied through $(if ($w.tiedThrough) { $w.tiedThrough } else { 'none' }), 2440 $(N $w.dep2440), 1218 $(N $w.rec1218)$(if ($w.reason) { ', ' + $w.reason })"
  if ($w.status -ne 'tied') { $ok = $false }
}
if (-not $lines.Count) { $lines = @('No weeks run.'); $ok = $false }
foreach ($f in @($r.flags)) { if ($f) { $lines += "Flag: $f"; $ok = $false } }
if ($r.note) { $lines += $r.note }
if ($ok) { & $Notify -Title $title -Ok -Lines $lines } else { & $Notify -Title $title -Lines $lines }
