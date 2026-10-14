# Post a card to the FARE Teams webhook in ~/.claude/fare-ubereats.json, tagging its mention contact.
# usage: notify-teams.ps1 -Title <t> -Mention code|done (-Lines <string[]> | -ResultFile <result.json>)
# code asks for the Uber login code; done reports the finished run.
param([string]$Title, [ValidateSet('code', 'done')][string]$Mention, [string[]]$Lines = @(), [string]$ResultFile)
$ErrorActionPreference = 'Stop'
$cfg = Get-Content -Raw "$env:USERPROFILE\.claude\fare-ubereats.json" | ConvertFrom-Json

if ($ResultFile) {
  $r = Get-Content -Raw -Encoding utf8 $ResultFile | ConvertFrom-Json
  $ok = @($r.stores | Where-Object { $_.status -eq 'approved' })
  $sum = ($ok | Measure-Object -Property amount -Sum).Sum
  $attention = [bool]$r.note
  $Lines = @("$($ok.Count) of $(@($r.stores).Count) stores approved with backup attached, $('{0:N2}' -f [double]$sum)")
  $Lines += foreach ($s in $r.stores) {
    if ($s.status -ne 'approved') { "- $($s.store): $($s.status)$(if ($s.amount) { ', ' + ('{0:N2}' -f [double]$s.amount) })"; $attention = $true }
    foreach ($w in @($s.warnings)) { if ($w) { "- $($s.store): $w"; $attention = $true } }
  }
  if ($r.note) { $Lines += $r.note }
  $Lines[0] = "**$(if ($attention) { 'Needs review' } else { 'Completed' }):** " + $Lines[0]
}

$who = $cfg.mention
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
