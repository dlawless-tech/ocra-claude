# One-time setup: Mondays every 15 min from 7:00 to 12:00, only while signed in.
$script = Join-Path $PSScriptRoot 'monday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 7:00
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At 7:00 -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Hours 5)).Repetition
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NORMS Weekly Change Orders' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the NORMS Change Orders entry once the week''s Change Order Report is in the folder, then reports to Teams.' -Force
