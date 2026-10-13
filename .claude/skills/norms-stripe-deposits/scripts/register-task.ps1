# One-time setup: Mondays at 16:00, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'monday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 16:00
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NORMS Stripe Deposits - Monday' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts every unmatched NORMS Stripe payout on 1020 as a Bank Deposit and posts the result to the NORMS Bank Activity channel, tagging Regina. Tags Tricia when Stripe texts a sign-in code.' -Force
