# One-time setup, only while signed in. Two Thursday tasks share labor-run.ps1:
#   6:00-11:50 AM every 10 minutes: runs as soon as the workbook lands in the folder
#   12:00 PM: last check, and a Teams card when last week's workbook has not arrived
$script = Join-Path $PSScriptRoot 'labor-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1 -Minutes 30) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""

$watch = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 6:00
$watch.Repetition = (New-ScheduledTaskTrigger -Once -At 6:00 -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Hours 5 -Minutes 55)).Repetition
Register-ScheduledTask -TaskName 'Bowery Labor Allocation - Thursday Watch' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode watch") -Trigger $watch -Settings $settings -Description 'Thursdays 6:00-11:50 AM every 10 minutes: posts the Bowery Labor Allocation entry once the workbook is dropped in Weekly Labor Allocations, files it to Completed, and reports to the payroll Teams channel.' -Force

$noon = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 12:00
Register-ScheduledTask -TaskName 'Bowery Labor Allocation - Thursday' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode scheduled") -Trigger $noon -Settings $settings -Description 'Thursdays 12:00 PM: last check; posts the Bowery Labor Allocation entry if the workbook is in, or reports to Teams that it is missing.' -Force
