# One-time setup, only while signed in. Thursdays, every 15 minutes 6:00 AM to noon, runs
# inventory-run.ps1, which posts once last Sunday's Purchase Transfers is filed. The Purchase
# Transfers run also starts this task the moment it approves on a Thursday.
$script = Join-Path $PSScriptRoot 'inventory-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""

$thu = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 6:00
$thu.Repetition = (New-ScheduledTaskTrigger -Once -At 6:00 -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Hours 6 -Minutes 5)).Repetition
Register-ScheduledTask -TaskName 'Bowery Inventory - Thursday' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg) -Trigger $thu -Settings $settings -Description 'Thursdays 6:00 AM-12:00 PM: once the week''s Bowery Purchase Transfers is filed, posts and approves the five Bowery Inventory entries from Craftable and reports to the Inventory Teams channel.' -Force
