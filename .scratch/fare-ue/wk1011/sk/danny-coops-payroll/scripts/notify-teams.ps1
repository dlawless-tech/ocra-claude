# Post a card to the Teams Workflows webhook in ~/.claude/danny-coops-payroll.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>)
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\danny-coops-payroll.json" | ConvertFrom-Json

# a plain -Lines message always needs a look
$attention = -not $ResultFile
$facts = @()
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $ok = $r.status -eq 'approved'
  $Lines = @($(if ($ok) { "Payroll entry **approved** at $('{0:N2}' -f [double]$r.total)" } else { "**Payroll entry $($r.status)**" }))
  $Lines += "Journal file attached: $(if ($r.attached) { 'yes' } else { '**no**' }); moved to Completed: $(if ($r.filed) { 'yes' } else { '**no**' })"
  if ($ok) { $Lines += "Direct deposit $('{0:N2}' -f [double]$r.directDeposit) is derived; tie it to the 1563 payroll withdrawal when it clears." }
  foreach ($x in @($r.warnings)) { if ($x) { $Lines += "- $x" } }
  if ($r.note) { $Lines += $r.note }
  $attention = -not $ok -or -not $r.attached -or -not $r.filed -or @($r.warnings | Where-Object { $_ }).Count -gt 0
  $facts = @(@{ title = 'Total'; value = '{0:N2}' -f [double]$r.total }, @{ title = 'Paper checks'; value = "$($r.paperChecks)" }, @{ title = 'Entry'; value = "$($r.number)" })
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
