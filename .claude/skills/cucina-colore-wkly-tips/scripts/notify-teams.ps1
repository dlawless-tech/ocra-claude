# Post a card to the Teams Workflows webhook in ~/.claude/cucina-colore-tips.json.
# usage: notify-teams.ps1 -Title <t> (-Lines <string[]> | -ResultFile <result.json>) [-DryRun]
param([string]$Title, [string[]]$Lines = @(), [string]$ResultFile, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\cucina-colore-tips.json" | ConvertFrom-Json

# a plain -Lines message is always a failure
$attention = -not $ResultFile
$facts = @()
if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $ok = $r.status -in 'approved', 'skipped'
  $je = if ($r.side -eq 'debit') { 'Dr 65650 / Cr 25100' } else { 'Dr 25100 / Cr 65650' }
  $Lines = @($(switch ($r.status) {
    'approved' { "Approved at **$('{0:N2}' -f [double]$r.amount)** ($je). 25100 Employee Tips Payable is zero at $($r.end)." }
    'skipped' { "Already approved at $('{0:N2}' -f [double]$r.amount), 25100 already zero." }
    'waiting' { "Payroll for W.E. $($r.end) is not approved in R365 as of $(Get-Date -Format 'ddd M/d h:mm tt'), so the Tips entry was not updated. Run it by hand once payroll is in." }
    default { "Status: **$($r.status)**, nothing approved." } }))
  foreach ($w in @($r.warnings)) { if ($w) { $Lines += $w } }
  if ($r.note -and $r.status -ne 'waiting') { $Lines += $r.note }
  if (-not $ok -or @($r.warnings | Where-Object { $_ }).Count) { $attention = $true }
  if ($r.status -ne 'waiting') {
    $facts = @(
      @{ title = 'Week'; value = "$($r.start) - $($r.end)" },
      @{ title = 'Beginning balance'; value = '{0:N2}' -f [double]$r.begBal },
      @{ title = 'Tips from sales'; value = '{0:N2}' -f [double]$r.sales },
      @{ title = 'Payroll'; value = '{0:N2}' -f [double]$r.payroll },
      @{ title = 'Balance before Tips entry'; value = '{0:N2}' -f [double]$r.balance },
      @{ title = 'Balance after'; value = '{0:N2}' -f [double]$r.balanceAfter })
  }
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
if ($DryRun) { $json; return }
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
