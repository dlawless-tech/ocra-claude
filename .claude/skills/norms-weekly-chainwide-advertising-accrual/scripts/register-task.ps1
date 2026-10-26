# One-time setup: Mondays at 7:00, 9:00 and 11:00, only while signed in. Later triggers do nothing once the week is done.
$start = [datetime]'2026-11-02 07:00'
$script = Join-Path $PSScriptRoot 'monday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At $start
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At $start -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration (New-TimeSpan -Hours 4 -Minutes 1)).Repetition
# local wall time, no UTC offset, so 7:00 holds across DST
$trigger.StartBoundary = $start.ToString('s')
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1 -Minutes 30) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'NORMS Weekly Chainwide Advertising' -Action $action -Trigger $trigger -Settings $settings -Description 'Posts the NORMS Chainwide Advertising entry for the week that ended Saturday, then confirms to Teams.' -Force
