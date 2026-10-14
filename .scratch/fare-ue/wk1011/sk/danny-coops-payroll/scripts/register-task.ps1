# One-time setup, only while signed in. Two Wednesday tasks share payroll-run.ps1:
#   2:00-6:50 PM every 10 minutes: runs as soon as the payroll journal lands
#   7:00 PM: last check, and a Teams card when the file has not arrived
$script = Join-Path $PSScriptRoot 'payroll-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1 -Minutes 30) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
Unregister-ScheduledTask -TaskName 'Danny & Coops Payroll - File Drop' -Confirm:$false -ErrorAction SilentlyContinue

$watch = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At 14:00
$watch.Repetition = (New-ScheduledTaskTrigger -Once -At 14:00 -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Hours 4 -Minutes 55)).Repetition
Register-ScheduledTask -TaskName 'Danny & Coops Payroll - Wednesday Watch' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode watch") -Trigger $watch -Settings $settings -Description 'Wednesdays 2:00-6:50 PM every 10 minutes: posts the Danny & Coops Payroll entry once the payroll-journal CSV is dropped, then reports to Teams.' -Force

$last = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At 19:00
Register-ScheduledTask -TaskName 'Danny & Coops Payroll - Wednesday' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode scheduled") -Trigger $last -Settings $settings -Description 'Wednesdays 7:00 PM: last check; posts the Danny & Coops Payroll entry if the file is in, or reports to Teams that it is missing.' -Force
