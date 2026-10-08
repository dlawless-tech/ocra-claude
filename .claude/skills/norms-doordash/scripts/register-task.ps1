# One-time setup: Thursdays at 4:00 with a 10:00 retry, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'thursday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = @((New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 04:00), (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 10:00))
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NORMS DoorDash Weekly' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the NORMS DoorDash entries for the Mon-Sun period paid that Thursday, then reports to Teams.' -Force
