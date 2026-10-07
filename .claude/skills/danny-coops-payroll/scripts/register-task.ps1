# One-time setup, only while signed in. Two tasks share payroll-run.ps1:
#   drop watch: every 10 minutes, runs as soon as a payroll journal lands in Downloads
#   Wednesday 2:00 PM: backstop, and a Teams card when the file has not arrived
$script = Join-Path $PSScriptRoot 'payroll-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1 -Minutes 30) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""

$watch = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 10)
Register-ScheduledTask -TaskName 'Danny & Coops Payroll - File Drop' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode watch") -Trigger $watch -Settings $settings -Description 'Every 10 minutes: posts the Danny & Coops Payroll entry when a payroll-journal CSV is dropped in Downloads, then reports to Teams.' -Force

$wed = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At 14:00
Register-ScheduledTask -TaskName 'Danny & Coops Payroll - Wednesday' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode scheduled") -Trigger $wed -Settings $settings -Description 'Wednesday 2:00 PM: posts the Danny & Coops Payroll entry if the file drop has not already, or reports to Teams that the file is missing.' -Force
