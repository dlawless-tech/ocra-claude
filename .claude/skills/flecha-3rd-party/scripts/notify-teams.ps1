# Post a card to the Flecha TPD Teams Workflows webhook in ~/.claude/flecha-3rd-party.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>) [-DryRun]
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\flecha-3rd-party.json" | ConvertFrom-Json
$m = { param($v) '{0:N2}' -f [double]$v }

# a plain -Lines message is always a failure
$attention = -not $ResultFile
$facts = @()
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  if ($r.status -eq 'done') {
    $Lines = @("**Completed:** 3rd Party W.E. $($r.weekEnding) approved at $(& $m $r.total), EZ Cater and Foodja at 30% of sales")
  } else {
    $Lines = @("**3rd Party W.E. $($r.weekEnding) $($r.status)**")
    $attention = $true
  }
  foreach ($x in @($r.warnings) + @($r.questions)) { if ($x) { $Lines += "- $x"; $attention = $true } }
  foreach ($x in @($r.notes)) { if ($x) { $Lines += "- $x" } }
  if ($r.note) { $Lines += $r.note }
  $facts = @($r.stores | ForEach-Object {
    $parts = @(); if ($_.ezCater) { $parts += "EZ Cater $(& $m $_.ezCater)" }; if ($_.foodja) { $parts += "Foodja $(& $m $_.foodja)" }
    @{ title = $_.store; value = "$(& $m $_.total) ($($parts -join ', '))" } })
}

$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) }
if ($facts.Count) { $content.body += @{ type = 'FactSet'; facts = $facts; spacing = 'Medium' } }
# mention needs an email; without one the card still posts, untagged
if ($cfg.mention -and $cfg.mention.email -and ($cfg.mentionWhen -eq 'always' -or $attention)) {
  $at = "<at>$($cfg.mention.name)</at>"
  $content.body += @{ type = 'TextBlock'; text = $(if ($attention) { "$at please review." } else { "$at posted and approved." }); wrap = $true }
  $content.msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $cfg.mention.email; name = $cfg.mention.name } }) }
}
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
if ($DryRun) { $json; exit 0 }
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
