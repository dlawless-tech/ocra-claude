# Post a card to the Teams Workflows webhook in ~/.claude/danny-coops-bank-downloads.json.
# usage: notify-teams.ps1 -Title <t> -RetrieveLog <retrieve.log lines>
# Tags the mention only on a problem: a FAIL, an error, a skipped account, an unfinished run, or Operating at 0 new.
param([string]$Title, [string[]]$RetrieveLog = @())
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\danny-coops-bank-downloads.json" | ConvertFrom-Json

$done = [bool]($RetrieveLog | Where-Object { $_ -match '^\d+ END' })
$problem = -not $done
$Lines = foreach ($l in $RetrieveLog) {
  if ($l -match '^\d+ RETRIEVED: (.+?) (\{.*\})$') {
    $name = $Matches[1]; $r = $Matches[2] | ConvertFrom-Json
    $ok = $null -eq $r.error -and $r.result -eq 1
    $zeroOp = $name -match 'Operating' -and $r.transactionsRetrieved -eq 0
    if (-not $ok -or $zeroOp) { $problem = $true }
    "**$name**: $($r.transactionsRetrieved) new, $($r.duplicatesFound) duplicates$(if (-not $ok) { ", ERROR $($r.error)" })$(if ($zeroOp) { ', no new activity on the operating account' })"
  }
  elseif ($l -match '^\d+ SKIPPED: (.+) \((.+)\)$') { $problem = $true; "**$($Matches[1])**: skipped, $($Matches[2]). Reconnect under Manage Bank Connections." }
  elseif ($l -match '^\d+ FAIL: (.+)$') { "FAILED: $($Matches[1])" }
}
if (-not $RetrieveLog.Count) { $Lines = @('The run wrote no retrieve log.') }
$Title = if ($problem) { "$Title NEEDS REVIEW" } else { "$Title complete" }

$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) }
if ($problem -and $cfg.mention -and $cfg.mention.email) {
  $at = "<at>$($cfg.mention.name)</at>"
  $content.body += @{ type = 'TextBlock'; text = "$at please review."; wrap = $true }
  $content.msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $cfg.mention.email; name = $cfg.mention.name } }) }
}
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
