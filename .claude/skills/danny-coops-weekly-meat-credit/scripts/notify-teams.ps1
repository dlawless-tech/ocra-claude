# Post a card to the Teams Workflows webhook in ~/.claude/danny-coops-meat-credit.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>)
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\danny-coops-meat-credit.json" | ConvertFrom-Json

# a plain -Lines message is always a failure
$attention = -not $ResultFile
$facts = @()
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $wk = @($r.weeks)
  $ok = @($wk | Where-Object { $_.status -in 'approved', 'corrected', 'created' })
  $bad = @($wk | Where-Object { $_.status -notin 'approved', 'corrected', 'created' })
  $new = $wk | Where-Object { $_.weekEnding -eq $r.weekEnding } | Select-Object -First 1
  $Lines = @("**$($ok.Count) of $($wk.Count)** weeks approved at 2.1% of AP invoices")
  if ($new) { $Lines += "W.E. $($new.weekEnding): $('{0:N2}' -f [double]$new.credit) on $('{0:N2}' -f [double]$new.invoices) invoices ($($new.count)), $($new.status)" }
  foreach ($w in $wk | Where-Object { $_.status -eq 'corrected' }) { $Lines += "- W.E. $($w.weekEnding) corrected $('{0:N2}' -f [double]$w.prior) to $('{0:N2}' -f [double]$w.credit)" }
  foreach ($w in $bad) { $Lines += "- **W.E. $($w.weekEnding)**: $($w.status)" }
  foreach ($w in $wk) { foreach ($x in @($w.warnings)) { if ($x) { $Lines += "  W.E. $($w.weekEnding): $x"; $attention = $true } } }
  if ($r.note) { $Lines += $r.note }
  if ($bad.Count) { $attention = $true }
  $facts = @($wk | ForEach-Object { @{ title = "W.E. $($_.weekEnding)"; value = $(if ($_.status -in 'approved', 'corrected', 'created') { '{0:N2}' -f [double]$_.credit } else { $_.status }) } })
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
