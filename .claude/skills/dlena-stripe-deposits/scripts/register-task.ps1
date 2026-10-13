# One-time setup: Tuesdays at 9:00, only while signed in. 8 hours covers both sign-in waits and the recon. A missed run starts when the machine is next available.
Unregister-ScheduledTask -TaskName 'dLena Stripe Deposits - Monday' -Confirm:$false -ErrorAction SilentlyContinue
$script = Join-Path $PSScriptRoot 'tuesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At 9:00
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 8) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'dLena Stripe Deposits - Tuesday' -Action $action -Trigger $trigger -Settings $settings -Description 'Signs Stripe in (code card tags Tricia), posts every unmatched dLena Stripe payout on 1123 as a Bank Deposit, posts the result to the dLena Bank Activity channel tagging Tricia, then runs the weekly event deposit recon.' -Force
