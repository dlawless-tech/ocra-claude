# One-time setup, only while signed in. Two tasks, every other week from 10/15/2026, share thursday-run.ps1:
#   Thu 4:00 AM to Fri 4:45 PM every 15 minutes: runs as soon as the WVJ files are in To Process SC
#   Fri 5:00 PM: last check, and a Teams card when files are still missing
$script = Join-Path $PSScriptRoot 'thursday-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$first = [datetime]'2026-10-15'

foreach ($old in 'NORMS Payroll SC - Thursday Watch', 'NORMS Payroll SC - Thursday') {
  Unregister-ScheduledTask -TaskName $old -Confirm:$false -ErrorAction SilentlyContinue
}

$watch = New-ScheduledTaskTrigger -Weekly -WeeksInterval 2 -DaysOfWeek Thursday -At $first.AddHours(4)
$watch.Repetition = (New-ScheduledTaskTrigger -Once -At $first.AddHours(4) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Hours 36 -Minutes 50)).Repetition
Register-ScheduledTask -TaskName 'NORMS Payroll SC - Watch' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode watch") -Trigger $watch -Settings $settings -Description 'Every other week, Thursday 4:00 AM to Friday 4:45 PM every 15 minutes: posts the NORMS Payroll - Support Center entry once the WVJ files are in To Process SC, files the folder, then confirms in the payroll channel.' -Force

$last = New-ScheduledTaskTrigger -Weekly -WeeksInterval 2 -DaysOfWeek Friday -At $first.AddDays(1).AddHours(17)
Register-ScheduledTask -TaskName 'NORMS Payroll SC - Friday Final' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "$arg -Mode final") -Trigger $last -Settings $settings -Description 'Every other Friday 5:00 PM: last check; posts the NORMS Payroll - Support Center entry if the files are in, or reports to Teams which are missing.' -Force
