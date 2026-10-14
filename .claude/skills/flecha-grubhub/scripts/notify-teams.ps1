# Post a card to the Teams Workflows webhook in ~/.claude/flecha-grubhub.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>)
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\flecha-grubhub.json" | ConvertFrom-Json

# a plain -Lines message is always a failure
$attention = -not $ResultFile
$facts = @()
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  if ($r.status -eq 'completed') {
    $Lines = @("**Completed:** GrubHub fees for $($r.period) estimated and approved, $('{0:N2}' -f [double]$r.estimateTotal) in all")
    if ($r.trueUpTotal -ne $null) { $Lines += "Prior period trued up to actuals, $('{0:N2}' -f [double]$r.trueUpTotal) in all" }
  } else {
    $Lines = @("**GrubHub fees $($r.period) $($r.status)**")
    $attention = $true
  }
  foreach ($x in @($r.warnings) + @($r.questions)) { if ($x) { $Lines += "- $x"; $attention = $true } }
  if ($r.note) { $Lines += $r.note }
  $facts = @($r.stores | ForEach-Object {
    $v = 'est {0:N2} on {1:N2} sales' -f [double]$_.estimate, [double]$_.sales
    if ($_.actual -ne $null) { $v = 'prior {0:N2} -> {1:N2}; {2}' -f [double]$_.priorEstimate, [double]$_.actual, $v }
    @{ title = $_.store; value = $v } })
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
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
