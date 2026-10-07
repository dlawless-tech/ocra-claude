# One-time setup: Mondays at 6:00, 8:00 and 10:00, only while signed in. Later triggers do nothing once the week is done.
$script = Join-Path $PSScriptRoot 'monday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 6:00
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At 6:00 -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration (New-TimeSpan -Hours 4 -Minutes 1)).Repetition
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1 -Minutes 30) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NORMS Weekly CC Fee Accrual' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the NORMS CC Fee Accrual entries for the week that ended Saturday, then reports to Teams.' -Force
