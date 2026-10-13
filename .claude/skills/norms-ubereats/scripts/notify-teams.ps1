# Post a card to the NORMS TPD Teams webhook in ~/.claude/norms-ubereats.json.
# usage: notify-teams.ps1 -Title <t> -Mention code|done (-Lines <string[]> | -ResultFile <result.json>)
# code tags codeMention (Uber login code needed); done tags doneMention (run finished).
param([string]$Title, [ValidateSet('code', 'done')][string]$Mention, [string[]]$Lines = @(), [string]$ResultFile)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\norms-ubereats.json" | ConvertFrom-Json

if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $ok = @($r.stores | Where-Object { $_.status -eq 'approved' })
  $sum = ($ok | Measure-Object -Property amount -Sum).Sum
  $Lines = @("**$($r.date)** (pay period $($r.period)): $($ok.Count) of $(@($r.stores).Count) approved, $('{0:N2}' -f [double]$sum)")
  foreach ($s in $r.stores) {
    if ($s.status -ne 'approved') { $Lines += "- $($s.store): $($s.status)$(if ($s.amount) { ', ' + ('{0:N2}' -f [double]$s.amount) })" }
    foreach ($w in @($s.warnings)) { if ($w) { $Lines += "- $($s.store): $w" } }
  }
  if ($r.note) { $Lines += $r.note }
}

$who = if ($Mention -eq 'code') { $cfg.codeMention } else { $cfg.doneMention }
$ask = if ($Mention -eq 'code') { 'please enter the Uber Eats code in the open browser window.' } else { 'please review.' }
$at = "<at>$($who.name)</at>"
$content = @{ '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'; type = 'AdaptiveCard'; version = '1.4'
  body = @(@{ type = 'TextBlock'; text = $Title; weight = 'Bolder'; size = 'Medium'; wrap = $true }) +
    @($Lines | ForEach-Object { @{ type = 'TextBlock'; text = $_; wrap = $true; spacing = 'Small' } }) +
    @(@{ type = 'TextBlock'; text = "$at $ask"; wrap = $true })
  msteams = @{ entities = @(@{ type = 'mention'; text = $at; mentioned = @{ id = $who.email; name = $who.name } }) } }
$body = @{ type = 'message'; attachments = @(@{ contentType = 'application/vnd.microsoft.card.adaptive'; contentUrl = $null; content = $content }) }
$json = $body | ConvertTo-Json -Depth 20
Invoke-RestMethod -Method Post -Uri $cfg.teamsWebhook -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) | Out-Null
