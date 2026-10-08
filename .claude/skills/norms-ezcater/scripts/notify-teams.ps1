# Post a card to the Teams Workflows webhook in ~/.claude/norms-ezcater.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>) [-DryRun]
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\norms-ezcater.json" | ConvertFrom-Json
function N($x) { '{0:N2}' -f [double]$x }

# a plain -Lines message is always a failure
$attention = -not $ResultFile
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $ok = @($r.stores | Where-Object { $_.status -in 'approved', 'entered' })
  $sum = ($ok | Measure-Object -Property fee -Sum).Sum
  $Lines = @("**Entry date $($r.entryDate)** (sales $($r.window)): $($ok.Count) of $(@($r.stores).Count) $($r.mode), fees $(N $sum)")
  foreach ($s in $r.stores) {
    $Lines += "- $($s.store): $($s.status)$(if ($s.fee -ne $null) { ', fee ' + (N $s.fee) })$(if ($s.difference) { ', difference ' + (N $s.difference) })"
    foreach ($w in @($s.warnings)) { if ($w) { $Lines += "- $($s.store): $w" } }
    if ($s.status -notin 'approved', 'entered', 'skipped' -or @($s.warnings | Where-Object { $_ }).Count) { $attention = $true }
  }
  $miss = @($r.missingSales)
  if ($miss.Count) {
    $attention = $true
    $Lines += "**EZ Cater orders missing from R365 sales** ($(N (($miss | Measure-Object -Property food -Sum).Sum)) food):"
    foreach ($m in $miss) { $Lines += "- $($m.store) $($m.date) order $($m.order): food $(N $m.food), caterer total due $(N $m.due)" }
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
