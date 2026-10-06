# One-time setup: Tuesdays every 15 min from 7:00 to 12:00, only while signed in.
$script = Join-Path $PSScriptRoot 'tuesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At 7:00
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At 7:00 -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Hours 5)).Repetition
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Bowery Weekly Cash Log' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the Bowery weekly cash log entries once all five logs are in.' -Force
