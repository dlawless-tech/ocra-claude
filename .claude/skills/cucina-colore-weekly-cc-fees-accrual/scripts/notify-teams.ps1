# Post a card to the Teams Workflows webhook in ~/.claude/cucina-colore-cc-fees-accrual.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>)
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\cucina-colore-cc-fees-accrual.json" | ConvertFrom-Json

# a plain -Lines message is always a failure
$attention = -not $ResultFile
$facts = @()
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $ok = $r.status -in 'approved', 'skipped'
  $Lines = @($(if ($ok) { "Approved at **$('{0:N2}' -f [double]$r.amount)**, 1.5% of the week's sales." } else { "Status: **$($r.status)**, nothing approved." }))
  foreach ($w in @($r.warnings)) { if ($w) { $Lines += $w } }
  if ($r.note) { $Lines += $r.note }
  if (-not $ok) { $attention = $true }
  $facts = @(
    @{ title = 'Week'; value = "$($r.start) - $($r.end)" },
    @{ title = 'Net sales'; value = '{0:N2}' -f [double]$r.netSales },
    @{ title = 'Accrual'; value = '{0:N2}' -f [double]$r.accrual },
    @{ title = 'Prior week net sales'; value = '{0:N2}' -f [double]$r.priorNetSales })
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
