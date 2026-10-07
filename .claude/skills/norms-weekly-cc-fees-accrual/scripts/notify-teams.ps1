# Post a card to the Teams Workflows webhook in ~/.claude/norms-cc-fees-accrual.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json> [-Retrying])
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile, [switch]$Retrying)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\norms-cc-fees-accrual.json" | ConvertFrom-Json

# a plain -Lines message is always a failure
$attention = -not $ResultFile
$facts = @()
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $st = @($r.stores)
  $ok = @($st | Where-Object { $_.status -in 'approved', 'skipped' })
  $total = ($ok | Measure-Object -Property amount -Sum).Sum
  $Lines = @("**$($ok.Count) of 24** stores approved, total accrual **$('{0:N2}' -f [double]$total)**")
  foreach ($s in $st | Where-Object { $_.status -notin 'approved', 'skipped' }) {
    $l = "- **$($s.store)**: $($s.status)"
    if ($s.status -eq 'held') { $l += ", net sales $('{0:N2}' -f [double]$s.netSales) vs prior week accrual $('{0:N2}' -f [double]$s.prior)" }
    $Lines += $l
    foreach ($w in @($s.warnings)) { if ($w) { $Lines += "  $w" } }
  }
  if ($Retrying) { $Lines += 'Held stores get another try on the next scheduled run.' }
  elseif (@($st | Where-Object { $_.status -eq 'held' }).Count) { $Lines += 'Held stores were not posted. Post them by hand once their sales are in.' }
  if ($r.note) { $Lines += $r.note }
  if ($ok.Count -lt 24) { $attention = $true }
  $facts = @($st | ForEach-Object { @{ title = $_.store; value = $(if ($_.status -in 'approved', 'skipped') { '{0:N2}' -f [double]$_.amount } else { $_.status }) } })
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
