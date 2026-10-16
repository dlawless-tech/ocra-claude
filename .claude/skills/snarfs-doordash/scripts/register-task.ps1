# One-time setup: Thursdays 14:00, retry Fridays 8:00, only while signed in.
$script = Join-Path $PSScriptRoot 'thursday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = @((New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 14:00), (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At 08:00))
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "Snarfs DoorDash Weekly" -Action $action -Trigger $trigger -Settings $settings -Description "Posts the Snarf's DoorDash entries for the Mon-Sun week once its Sunday payouts land, then reports to Teams." -Force
