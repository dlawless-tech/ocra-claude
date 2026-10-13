# One-time setup: Mondays at 15:00, from 10/19/2026, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'monday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At ([datetime]'2026-10-19 15:00')
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Bowery Stripe Deposits - Monday' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts every unmatched Shuka (Resy) Stripe payout on 100-03 as a Bank Deposit and posts the result to the Bowery Bank Activity channel, tagging Brandy. Tags Tricia when Stripe texts a sign-in code.' -Force
