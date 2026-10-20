# One-time setup: Wednesdays at 19:00, then hourly to Thursday 18:00 until the deposits show, only while signed in.
# A missed run starts when the machine is next available.
$script = Join-Path $PSScriptRoot 'weekly-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At 19:00
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At 19:00 -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Hours 23)).Repetition
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 4) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NORMS Grubhub Weekly' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts or checks the NORMS Grubhub entries for the period that ended Monday once its deposits show, then reports to Teams.' -Force
