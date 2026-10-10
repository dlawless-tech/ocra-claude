# Post a card to the Teams Workflows webhook in ~/.claude/bowery-bank-downloads.json.
# usage: notify-teams.ps1 -Title <t> -RetrieveLog <retrieve.log lines>
param([string]$Title, [string[]]$RetrieveLog = @())
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\bowery-bank-downloads.json" | ConvertFrom-Json

# a retried account keeps only its last line
$last = [ordered]@{}
foreach ($l in $RetrieveLog) { if ($l -match '^(\d+) ') { $last[$Matches[1]] = $l } }
$RetrieveLog = @($last.Values)
$done = [bool]($RetrieveLog | Where-Object { $_ -match '^\d+ END' })
$Lines = foreach ($l in $RetrieveLog) {
  if ($l -match '^\d+ RETRIEVED: (.+?) (\{.*\})$') {
    $r = $Matches[2] | ConvertFrom-Json
    $ok = $null -eq $r.error -and $r.result -eq 1
    "**$($Matches[1])**: $($r.transactionsRetrieved) new, $($r.duplicatesFound) duplicates$(if (-not $ok) { ", ERROR $($r.error)" })"
    if (-not $ok) { $done = $false }
  }
  elseif ($l -match '^\d+ SKIPPED: (.+) \((.+)\)$') { "$($Matches[1]): skipped, $($Matches[2])" }
  elseif ($l -match '^\d+ FAIL: (.+)$') { "FAILED: $($Matches[1])" }
}
if (-not $RetrieveLog.Count) { $Lines = @('The run wrote no retrieve log.') }
$Title = if ($done) { "$Title complete" } else { "$Title FAILED" }

$at = "<at>$($cfg.mention.name)</at>"
$tail = if ($done) { "$at bank activity for the week is downloaded." } else { "$at the download did not finish; please check." }
$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) +
    @(@{ type = 'TextBlock'; text = $tail; wrap = $true })
  msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $cfg.mention.email; name = $cfg.mention.name } }) } }
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
