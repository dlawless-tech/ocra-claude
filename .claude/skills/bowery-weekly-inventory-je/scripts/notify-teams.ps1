# Post a card to the Inventory channel webhook in ~/.claude/bowery-inventory.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>)
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\bowery-inventory.json" | ConvertFrom-Json

# a plain -Lines message always needs a look
$attention = -not $ResultFile
$facts = @()
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $ok = $r.status -eq 'approved'
  $Lines = @($(if ($ok) { "All five Inventory entries **approved**" } else { "**Inventory entries $($r.status)**" }))
  $sig = { param($v) $(if ([double]$v -ge 0) { '+' } else { '-' }) + ('{0:N2}' -f [math]::Abs([double]$v)) }
  foreach ($s in @($r.stores)) {
    if (-not $s) { continue }
    $c = $s.changes
    $Lines += "- $($s.store): $('{0:N2}' -f [double]$s.total), $($s.status). Liquor $(& $sig $c.Liquor), Wine $(& $sig $c.Wine), Beer $(& $sig $c.Beer), N/A $(& $sig $c.'N/A')$(if (-not $s.attached) { '. **Export not attached**' })"
    $facts += @{ title = $s.store; value = '{0:N2}' -f [double]$s.total }
  }
  foreach ($x in @($r.large)) { if ($x) { $Lines += "- Large change: $x" } }
  foreach ($x in @($r.warnings)) { if ($x) { $Lines += "- $x" } }
  if ($r.note) { $Lines += $r.note }
  $attention = -not $ok -or @($r.stores | Where-Object { $_ -and -not $_.attached }).Count -gt 0 -or @($r.warnings | Where-Object { $_ }).Count -gt 0
}

$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) }
if ($facts.Count) { $content.body += @{ type = 'FactSet'; facts = $facts; spacing = 'Medium' } }
if ($cfg.mention -and $cfg.mention.email -and ($cfg.mentionWhen -eq 'always' -or $attention)) {
  $at = "<at>$($cfg.mention.name)</at>"
  $content.body += @{ type = 'TextBlock'; text = $(if ($attention) { "$at please review." } else { "$at posted and approved." }); wrap = $true }
  $content.msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $cfg.mention.email; name = $cfg.mention.name } }) }
}
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
