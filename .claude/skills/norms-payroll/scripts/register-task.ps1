# One-time setup, only while signed in. Two tasks share thursday-run.ps1:
#   Thursday 5:00 AM to Friday 4:45 PM every 15 minutes: runs as soon as all four ADP files are in To Process_Norms
#   Friday 5:00 PM: last check, and a Teams card when files are still missing
$script = Join-Path $PSScriptRoot 'thursday-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""

$watch = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 05:00
$watch.Repetition = (New-ScheduledTaskTrigger -Once -At 05:00 -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Hours 35 -Minutes 50)).Repetition
Register-ScheduledTask -TaskName 'NORMS Payroll - Thursday Watch' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode watch") -Trigger $watch -Settings $settings -Description 'Thursday 5:00 AM to Friday 4:45 PM every 15 minutes: posts the NORMS Payroll entry once the ADP files are in To Process_Norms, files the week, then confirms in the payroll channel.' -Force

Unregister-ScheduledTask -TaskName 'NORMS Payroll - Thursday' -Confirm:$false -ErrorAction SilentlyContinue
$last = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At 17:00
Register-ScheduledTask -TaskName 'NORMS Payroll - Friday' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode final") -Trigger $last -Settings $settings -Description 'Fridays 5 PM: last check; posts the NORMS Payroll entry if the files are in, or reports to Teams which are missing.' -Force
