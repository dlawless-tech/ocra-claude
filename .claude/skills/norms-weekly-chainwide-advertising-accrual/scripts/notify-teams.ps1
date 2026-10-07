# Post a card to the Teams Workflows webhook in ~/.claude/norms-chainwide-advertising.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>) [-DryRun]
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\norms-chainwide-advertising.json" | ConvertFrom-Json

# a plain -Lines message is always a failure or a miss
$attention = -not $ResultFile
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $l = "**Chainwide Advertising**: $($r.status)"
  if ($r.amount) { $l += ", $('{0:N2}' -f [double]$r.amount) across $($r.stores) stores on net sales $('{0:N2}' -f [double]$r.netSales)" }
  $Lines = @($l)
  foreach ($h in @($r.held)) {
    if ($h) { $Lines += "- $($h.store): net sales $('{0:N2}' -f [double]$h.netSales), $($h.dropPct)% below last week" }
  }
  if ($r.status -eq 'held') { $Lines += 'Nothing posted yet; the next trigger tries again.' }
  foreach ($w in @($r.warnings)) { if ($w) { $Lines += "- $w" } }
  if ($r.note) { $Lines += $r.note }
  if ($r.status -notin 'approved', 'skipped' -or @($r.held | Where-Object { $_ }).Count -or @($r.warnings | Where-Object { $_ }).Count) { $attention = $true }
}

$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) }
if ($cfg.mention -and ($cfg.mentionWhen -eq 'always' -or $attention)) {
  $at = "<at>$($cfg.mention.name)</at>"
  $ask = if ($attention) { 'please review.' } else { 'posted and approved.' }
  $content.body += @{ type = 'TextBlock'; text = "$at $ask"; wrap = $true }
  $content.msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $cfg.mention.email; name = $cfg.mention.name } }) }
}
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
if ($DryRun) { $json; return }
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
