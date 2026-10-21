# One-time setup, only while signed in: Wednesdays hourly 8:00-18:00, from 10/28/2026.
# A missed start runs when the machine is next available.
$script = Join-Path $PSScriptRoot 'wednesday-run.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = @(8..18 | ForEach-Object { New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At ([datetime]('2026-10-28 {0}:00' -f $_)) })
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'dLena AP Pymt & Confirmation - Wednesday' -Action $action -Trigger $trigger -Settings $settings -Description 'Once the week''s dLena AP Aging.xlsx is in Downloads, pays Halperns and Julius Silvert by ACH in R365, attaches and emails the stubs, posts to Teams, then moves the AP Aging into the WE folder.' -Force
