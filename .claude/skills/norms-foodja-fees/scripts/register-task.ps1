# One-time setup: Fridays at 7:00 with a 13:00 retry, only while signed in. A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'friday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = @((New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At 07:00), (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At 13:00))
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NORMS Foodja Fees' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the NORMS Foodja Fees entries for each closed two-week Foodja statement period, then reports to Teams.' -Force
