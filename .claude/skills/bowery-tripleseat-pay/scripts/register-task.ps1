# One-time setup, only while signed in. No schedule of its own: the Bowery bank downloads run
# starts it once the week's download is complete.
$script = Join-Path $PSScriptRoot 'tripleseat-run.ps1'
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
Register-ScheduledTask -TaskName 'Bowery Tripleseat Pay - After Bank Downloads' -Action (New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg) -Settings $settings -Description 'Started by the Bowery bank downloads run: splits the week''s Tripleseat Pay deposits for Rosie''s, Vic''s and Cookshop and confirms to Brandy in the Bank Activity Teams channel.' -Force
