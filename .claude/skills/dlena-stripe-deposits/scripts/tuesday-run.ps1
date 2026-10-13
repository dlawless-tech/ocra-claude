# Task Scheduler entry point, Tuesdays 9:00. Signs Stripe in (tagging Tricia for the texted code),
# posts every unmatched Stripe line on 1123, reports to Teams, then starts the event deposit recon.
# usage: tuesday-run.ps1 [-Date yyyy-MM-dd] [-Force]
# -Date stands in for today. -Force reruns a day already marked done.
param([string]$Date, [switch]$Force)
$ErrorActionPreference = 'Stop'

$Repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$Notify = "$PSScriptRoot\notify-teams.ps1"
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$Bash = "$env:ProgramFiles\Git\bin\bash.exe"

$today = if ($Date) { [datetime]::ParseExact($Date, 'yyyy-MM-dd', $null) } else { (Get-Date).Date }
$day = '{0}/{1}/{2}' -f $today.Month, $today.Day, $today.Year
$run = Join-Path $Repo (".scratch\dlena-stripe-deposits\run{0:MMdd}" -f $today)
$done = Join-Path $run 'done.txt'
if ((Test-Path $done) -and -not $Force) { exit 0 }
New-Item -ItemType Directory -Force $run | Out-Null
$log = Join-Path $run 'tuesday-run.log'
function Log($m) { "$(Get-Date -Format s) $m" | Out-File -Append -Encoding utf8 $log }
$result = Join-Path $run 'result.json'
Remove-Item -ErrorAction SilentlyContinue $result
$title = "dLena Stripe deposits $day"

# sessions bind to the work dir; stu stays open for claude
Set-Location $run
$ErrorActionPreference = 'Continue'
Log "run $day; Stripe sign-in"
$login = (& $Bash "$PSScriptRoot/stripe-login.sh" stu 1800 2>&1) -join ' '
$code = $LASTEXITCODE
Log "stripe-login exited $code $login"
if ($code -ne 0) {
  $ErrorActionPreference = 'Stop'
  if ($code -eq 2) { & $Notify -Code -Title "$title waiting on Stripe sign-in" -Lines @('No code was typed within 30 minutes. Type it into the open Stripe window, then run tuesday-run.ps1 again.') }
  else { & $Notify -Title "$title FAILED" -Lines @("Stripe sign-in: $login", $log) }
  exit 1
}

Log 'starting claude'
$prompt = @"
/dlena-stripe-deposits Unattended run for $day. Follow the skill's Unattended run section.
Work directory: $run
"@
Set-Location $Repo
# 5.1 turns native stderr into errors; Stop would kill the run
& $Claude -p $prompt --permission-mode auto 2>&1 | Out-File -Append -Encoding utf8 $log
Log "claude exited $LASTEXITCODE"
$r = if (Test-Path $result) { Get-Content -Raw -Encoding utf8 $result | ConvertFrom-Json } else { $null }
# backstop for a run that died before closing; stu stays open for the next skill
Set-Location $run
& playwright-cli -s=dlu close 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'

if (-not $r) {
  & $Notify -Title "$title FAILED" -Lines @('The run ended without a result file. Check the log:', $log)
  exit 1
}
Set-Content -Encoding utf8 $done "done $(Get-Date -Format s)"
& $Notify -Title $title -ResultFile $result

# hand off to the event deposit recon for the week through last Sunday, unless a payout in it is still unposted
$sun = $today.AddDays(-$(if ($today.DayOfWeek -eq 'Sunday') { 7 } else { [int]$today.DayOfWeek }))
$open = @($r.payouts | Where-Object { $_.status -ne 'posted' -and [datetime]::Parse($_.bankDate) -le $sun })
if ($open.Count) {
  Log "recon held: $($open.Count) payout(s) through $($sun.ToString('M/d')) unposted"
  & $Notify -Title "dLena event deposit recon held $day" -Ask 'post these, then run the recon (weekly-run.ps1).' -Lines (@("Stripe payouts through $($sun.ToString('M/d/yyyy')) still unposted:") + @($open | ForEach-Object { "- $($_.bankDate) $('{0:N2}' -f [double]$_.amount): $($_.status)" }))
  exit 0
}
Log 'starting event deposit recon'
& "$Repo\.claude\skills\dlena-weekly-event-deposit-recon\scripts\weekly-run.ps1" -Date $today.ToString('yyyy-MM-dd')
