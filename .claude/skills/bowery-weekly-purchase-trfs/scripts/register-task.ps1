# One-time setup, only while signed in. Two tasks share purchase-trfs-run.ps1:
#   every 15 minutes, 6:00 AM to 10:00 PM daily: runs as soon as a tracker lands in the folder
#   Thursday 10:00 AM: scheduled run, and a Teams card when last week's tracker has not arrived
$script = Join-Path $PSScriptRoot 'purchase-trfs-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1 -Minutes 30) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""

$watch = New-ScheduledTaskTrigger -Daily -At 6:00
$watch.Repetition = (New-ScheduledTaskTrigger -Once -At 6:00 -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Hours 16)).Repetition
Register-ScheduledTask -TaskName 'Bowery Purchase Transfers - File Drop' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode watch") -Trigger $watch -Settings $settings -Description 'Every 15 minutes 6:00 AM-10:00 PM: posts the Bowery Purchase Transfers entry once a GL_Reallocation_Tracker is dropped in Weekly Purchase Transfers, files it to Completed, and reports to Teams.' -Force

$thu = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 10:00
Register-ScheduledTask -TaskName 'Bowery Purchase Transfers - Thursday' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode scheduled") -Trigger $thu -Settings $settings -Description 'Thursdays 10:00 AM: posts the Bowery Purchase Transfers entry if the tracker is in, or reports to Teams that it is missing.' -Force
