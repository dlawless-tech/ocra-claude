---
name: nfl-schedule-to-sheet
description: Copy an NFL team's season schedule from NFL.com into a Google Sheet. Use when asked to pull a team's schedule into a sheet, or to repeat that transfer for another team.
---

# NFL schedule into a Google Sheet

Two `playwright-cli` sessions run side by side: `default` holds the NFL.com source page, `gdrive` holds the signed-in Google session. Read from one, paste into the other.

## Sessions

```bash
playwright-cli -s=default open https://www.nfl.com/schedules/<season>/by-team/<team-slug>
playwright-cli -s=gdrive open --persistent --headed https://drive.google.com/drive/home
```

`gdrive` needs `--persistent` so the Google login survives a close, and `--headed` so the human can type the password into a window the transcript never sees. Fill the email field, then stop and hand over the keyboard.

The team page at `nfl.com/teams/<team-slug>/` carries no schedule data. Go straight to the `schedules` URL.

## Reading the schedule

Every game is one link whose accessible name holds all three fields:

```
link "Broncos at Chiefs, Monday, September 14th, 8:15 PM, ESPN"
```

Grep the snapshot file for week headings and game links together, so bye weeks stay in sequence:

```bash
grep -nE 'heading "Week [0-9]+"|- link "([A-Za-z0-9]+ at [A-Za-z0-9]+),|BYE WEEK' <snapshot>.yml
```

Preseason weeks 1-3 appear above regular season week 1 and repeat the numbering. Take the block below the preseason one.

The bye week gets its own row with the game column reading `BYE`, keeping `row = week + 2` true for every week. Late weeks read `TBD` for date and time until the league sets them.

## Dates cross the year boundary

Weeks landing in January belong to `season + 1`. Paste explicit `M/D/YYYY` so Sheets cannot stamp the wrong year on them: a bare `Sun, Jan 3` in a 2026 season parses as 1/3/2026.

## Writing into the sheet

The Sheets grid is a canvas, so a snapshot returns no cell values. Drive it through two DOM handles:

- `#t-name-box` navigates to a cell or range, and reads back the selected range after a paste
- `#t-formula-bar-input` reads the active cell's value

Paste a whole block through the system clipboard rather than typing cell by cell:

```powershell
Set-Clipboard -Value ($rows -join "`r`n")     # each row is tab-separated
playwright-cli -s=gdrive fill "#t-name-box" "B3" --submit
playwright-cli -s=gdrive press "ControlOrMeta+v"
```

The name box reading back `B3:D20` confirms the paste landed and sized correctly.

Sheets parses pasted dates and times into date and time values, so `8:15 PM` displays as `8:15:00 PM`. Prefix with `'` to keep them literal text.

## Naming and closing

New sheet: `playwright-cli -s=gdrive tab-new https://sheets.new`.

Sheets autosaves, so "save as" means rename:

```bash
playwright-cli -s=gdrive click "input.docs-title-input"
playwright-cli -s=gdrive press "ControlOrMeta+a"
playwright-cli -s=gdrive type "<new name>"
playwright-cli -s=gdrive press "Enter"
```

Renaming replaces the existing name. When the human's wording could mean a duplicate instead, say which one you did.

Verify before reporting: spot-check the first row, the bye row, and the last row through the formula bar, then reload Drive home and confirm the file name.

## Refs go stale

Any navigation, paste, or dialog invalidates snapshot refs (`Ref e412 not found`). Re-run `find` for a fresh ref rather than reusing one from an earlier snapshot. CSS selectors like `#t-name-box` survive, which is why the Sheets steps use them.
