# One-time setup, only while signed in. Mondays every 15 minutes, 6:00 AM to 10:00 PM:
# runs Management Fees and Intercompany Transfers as soon as the workbook lands in the folder.
$script = Join-Path $PSScriptRoot 'mgmt-ic-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""

$watch = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 6:00
$watch.Repetition = (New-ScheduledTaskTrigger -Once -At 6:00 -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Hours 16)).Repetition
Register-ScheduledTask -TaskName 'Bowery Mgmt Fees & IC Transfers - Monday' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg) -Trigger $watch -Settings $settings -Description 'Mondays every 15 minutes 6:00 AM-10:00 PM: posts the Bowery Management Fees and Intercompany Transfers entries once the workbook is dropped in Mgmt Fees & Intercompany Transfers, files it to Completed, and reports to Teams.' -Force
