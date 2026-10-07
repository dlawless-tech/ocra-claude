# One-time setup: Mondays at 6:30, 8:30 and 10:30, only while signed in. Later triggers do nothing once the week is done.
$script = Join-Path $PSScriptRoot 'monday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 6:30
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At 6:30 -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration (New-TimeSpan -Hours 4 -Minutes 1)).Repetition
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1 -Minutes 30) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NORMS Weekly Chainwide Advertising' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the NORMS Chainwide Advertising entry for the week that ended Saturday, then confirms to Teams.' -Force
