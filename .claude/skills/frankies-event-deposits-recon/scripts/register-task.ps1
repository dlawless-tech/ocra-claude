# One-time setup: Thursdays 15:00, only while signed in.
$script = Join-Path $PSScriptRoot 'thursday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 15:00
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Frankies Event Deposits Recon Weekly' -Action $action -Trigger $trigger -Settings $settings -Description 'Re-reconciles the prior week, then reconciles the Frankies 457 event deposits for the Mon-Sun week ended the Sunday before, and reports to the Event Sales Entry Teams channel.' -Force
