# One-time setup: Thursdays 10:30, retries Thu 14:00 and Fri 6:00, only while signed in.
$script = Join-Path $PSScriptRoot 'thursday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = @((New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 10:30), (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 14:00),
  (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At 06:00))
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Frankies DoorDash Weekly' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the Frankies 457 and F&F Pizzeria DoorDash entries for the Mon-Sun week once its Sunday payout lands, then reports to Teams.' -Force
