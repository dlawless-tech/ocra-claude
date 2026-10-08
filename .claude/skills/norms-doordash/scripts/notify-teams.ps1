# Post a card to the Teams Workflows webhook in ~/.claude/norms-doordash.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>) [-DryRun]
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\norms-doordash.json" | ConvertFrom-Json

# a plain -Lines message is always a failure
$attention = -not $ResultFile
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $ok = @($r.stores | Where-Object { $_.status -eq 'approved' })
  $sum = ($ok | Measure-Object -Property amount -Sum).Sum
  $Lines = @("**$($r.entryDate)** (period $($r.period)): $($ok.Count) of $(@($r.stores).Count) approved, $('{0:N2}' -f [double]$sum)")
  foreach ($s in $r.stores) {
    $Lines += "- $($s.store): $($s.status)$(if ($s.amount) { ', ' + ('{0:N2}' -f [double]$s.amount) })$(if ($s.payout) { ', payout ' + $s.payout })"
    foreach ($w in @($s.warnings)) { if ($w) { $Lines += "- $($s.store): $w" } }
    if ($s.status -notin 'approved', 'skipped', 'no-payout' -or @($s.warnings | Where-Object { $_ }).Count) { $attention = $true }
  }
  if ($r.note) { $Lines += $r.note; $attention = $true }
}

$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) }
if ($cfg.mention -and ($cfg.mentionWhen -eq 'always' -or $attention)) {
  $at = "<at>$($cfg.mention.name)</at>"
  $content.body += @{ type = 'TextBlock'; text = "$at please review."; wrap = $true }
  $content.msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $cfg.mention.email; name = $cfg.mention.name } }) }
}
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
if ($DryRun) { $json; return }
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
