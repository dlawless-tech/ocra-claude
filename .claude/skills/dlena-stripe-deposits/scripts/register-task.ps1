# One-time setup: Mondays at 5:00, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'monday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 5:00
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'dLena Stripe Deposits - Monday' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts every unmatched dLena Stripe payout on 1123 as a Bank Deposit and posts the result to the dLena Bank Activity channel, tagging Tricia.' -Force
