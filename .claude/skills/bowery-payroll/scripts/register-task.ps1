# One-time setup, only while signed in. Two Thursday tasks share payroll-run.ps1:
#   8:00 AM-5:50 PM every 10 minutes: runs once the week's files are all in
#   6:00 PM: last check, and a Teams card when the files have not arrived
$script = Join-Path $PSScriptRoot 'payroll-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""

$watch = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 08:00
$watch.Repetition = (New-ScheduledTaskTrigger -Once -At 08:00 -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Hours 9 -Minutes 55)).Repetition
Register-ScheduledTask -TaskName 'Bowery Payroll - Thursday Watch' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode watch") -Trigger $watch -Settings $settings -Description 'Thursdays 8:00 AM-5:50 PM every 10 minutes: posts and approves the Bowery payroll entries once the GL and Net Pay Reports are in the Payroll folder, files the week, then reports to Teams.' -Force

$last = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 18:00
Register-ScheduledTask -TaskName 'Bowery Payroll - Thursday' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode scheduled") -Trigger $last -Settings $settings -Description 'Thursdays 6:00 PM: last check; runs the Bowery payroll if the files are in, or reports to Teams that they are missing.' -Force
