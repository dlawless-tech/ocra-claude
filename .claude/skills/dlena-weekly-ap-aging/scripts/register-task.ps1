# One-time setup, only while signed in: Wednesdays every 15 min from 8:00 to 18:00.
$script = Join-Path $PSScriptRoot 'wednesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At ([datetime]'2026-11-04 8:00')
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At 8:00 -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Hours 10)).Repetition
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'dLena Weekly AP Aging - Wednesday' -Action $action -Trigger $trigger -Settings $settings -Description 'Once the week''s dLena AP Aging.xlsx is in Downloads, emails it to the owners as dLena Weekly AP we <M.D>.' -Force
