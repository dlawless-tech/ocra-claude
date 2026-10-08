# One-time setup, only while signed in. Two Thursday tasks, every other week from 10/15/2026, share thursday-run.ps1:
#   4:00-11:45 AM every 15 minutes: runs as soon as the WVJ files are in To Process SC
#   12:00 PM: last check, and a Teams card when files are still missing
$script = Join-Path $PSScriptRoot 'thursday-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$first = [datetime]'2026-10-15'

$watch = New-ScheduledTaskTrigger -Weekly -WeeksInterval 2 -DaysOfWeek Thursday -At $first.AddHours(4)
$watch.Repetition = (New-ScheduledTaskTrigger -Once -At $first.AddHours(4) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Hours 7 -Minutes 50)).Repetition
Register-ScheduledTask -TaskName 'NORMS Payroll SC - Thursday Watch' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode watch") -Trigger $watch -Settings $settings -Description 'Every other Thursday 4:00-11:45 AM every 15 minutes: posts the NORMS Payroll - Support Center entry once the WVJ files are in To Process SC, files the folder, then confirms in the payroll channel.' -Force

$last = New-ScheduledTaskTrigger -Weekly -WeeksInterval 2 -DaysOfWeek Thursday -At $first.AddHours(12)
Register-ScheduledTask -TaskName 'NORMS Payroll SC - Thursday' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode final") -Trigger $last -Settings $settings -Description 'Every other Thursday noon: last check; posts the NORMS Payroll - Support Center entry if the files are in, or reports to Teams which are missing.' -Force
